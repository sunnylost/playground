import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import chokidar from 'chokidar'
import { init as esModuleLexerInit, parse as esModuleLexerParse } from 'es-module-lexer'
import esbuild from 'esbuild'
import Fastify from 'fastify'
import colors from 'picocolors'
import { compileScript, compileStyle, compileTemplate, parse as sfcParse } from 'vue/compiler-sfc'
import type { WebSocket } from 'ws'
import { WebSocketServer as WebSocketServerRaw } from 'ws'

const HOST = '127.0.0.1'
const PORT = 8080
const HMR_PORT = 9090
const startTime = performance.now()

await esModuleLexerInit

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(currentDir, process.argv.slice(-1)[0])
const cacheDirPathString = '/node_modules/.mini-vite-cache'
const cacheDepDirString = `${cacheDirPathString}/deps`
const cacheDir = path.resolve(rootDir, `.${cacheDirPathString}`)
const cacheDepDir = path.resolve(rootDir, `.${cacheDepDirString}`)
const codeCache = new Map<
    string,
    {
        isLibrary: boolean
        content: string
    }
>()
const bundleNameMap = new Map<string, [string, string]>()
const bundleNamePrefix = '/@bundleModule/'
const specialFileNamePrefix = '/@specialModule/'
const externals = new Set<string>()
const hash = createHash('sha256')
const server = Fastify()

type HMRType = 'connect' | 'full-reload'

let hmrServer: {
    send: (type: HMRType, message?: object) => void
}

function createDir(path: string) {
    try {
        fs.statSync(path)
    } catch {
        fs.mkdirSync(path)
    }
}

function createTempCssFile(content = '') {
    return createTempFile(`
    const style = document.createElement('style');
    style.innerHTML = \`${content}\`;
    document.head.appendChild(style);
    `)
}

function createTempFile(content = '') {
    const tempFileName = `temp-${hash.update(content).copy().digest('hex').substring(0, 8)}.js`
    const outputPath = `${cacheDir}/${tempFileName}`

    fs.writeFileSync(outputPath, content, {
        encoding: 'utf8'
    })
    return outputPath
}

function preBundle(moduleName: string) {
    if (bundleNameMap.has(moduleName)) {
        return bundleNameMap.get(moduleName)?.[1]
    }

    externals.add(moduleName)
    const bundleName = `bundle-${hash.update(moduleName).copy().digest('hex').substring(0, 8)}.js`
    const outputPath = `${cacheDir}/${bundleName}`
    const tempFilePath = `${cacheDir}/temp-bundle.js`
    bundleNameMap.set(bundleName, [outputPath, `${bundleNamePrefix}${bundleName}`])
    bundleNameMap.set(moduleName, [outputPath, `${bundleNamePrefix}${bundleName}`])
    fs.writeFileSync(
        tempFilePath,
        `
    export * as default from '${moduleName}'
    export * from '${moduleName}'
    `,
        {
            encoding: 'utf8'
        }
    )
    esbuild.buildSync({
        entryPoints: [tempFilePath],
        outfile: outputPath,
        bundle: true,
        format: 'esm'
    })
    fs.rmSync(tempFilePath)
    return bundleNameMap.get(bundleName)?.[1]
}

function serveFile(url: string) {
    let filePath = ''
    let isBundle = false
    let isLibrary = false
    let isExist = true
    let content = ''

    if (url.startsWith(bundleNamePrefix)) {
        isBundle = true
        isLibrary = true
        filePath = bundleNameMap.get(url.replace(bundleNamePrefix, ''))?.[0] ?? ''
    } else if (url.startsWith(specialFileNamePrefix)) {
        isBundle = false
        isLibrary = true
        filePath = path.resolve(currentDir, url.replace(specialFileNamePrefix, ''))
    } else {
        filePath = path.resolve(rootDir, path.isAbsolute(url) ? `.${url}` : url)
    }

    if (codeCache.has(filePath)) {
        const cache = codeCache.get(filePath)

        return {
            isExist: true,
            isLibrary: cache?.isLibrary,
            content: cache?.content
        }
    }

    console.log(`${filePath} 缓存失效，重新读取`)

    try {
        const ext = path.extname(url)
        const fileContent = fs.readFileSync(filePath, {
            encoding: 'utf8'
        })
        let code = ''

        switch (ext) {
            case '.ts':
                code = esbuild.transformSync(fileContent, {
                    loader: 'ts'
                }).code
                break

            case '.vue': {
                const parsed = sfcParse(fileContent)
                const scopeId = `v-${hash.update(fileContent).copy().digest('hex').substring(0, 8)}`

                const { content: compiledScript, bindings } = compileScript(parsed.descriptor, {
                    id: scopeId
                })
                const { code: compiledTemplate } = compileTemplate({
                    filename: filePath,
                    id: scopeId,
                    source: parsed.descriptor.template?.content ?? '',
                    compilerOptions: {
                        bindingMetadata: bindings
                    }
                })

                const compiledStyle = parsed.descriptor.styles
                    .map((style) => {
                        return (
                            compileStyle({
                                id: scopeId,
                                filename: filePath,
                                source: style.content
                            }).code ?? ''
                        )
                    })
                    .join('\n\n') as string

                const tempScriptPath = createTempFile(compiledScript)
                const tempTemplatePath = createTempFile(compiledTemplate)
                const tempStylePath = createTempCssFile(compiledStyle)
                const tempSfcFilePath = createTempFile(`
                import sfc_main from '${tempScriptPath}';
                import { render } from '${tempTemplatePath}';
                import '${tempStylePath}';
                
                sfc_main.render = render;
                sfc_main.__file = '${filePath}';
                sfc_main.__scopeId = '${scopeId}';
                
                export default sfc_main;
            `)

                const result = esbuild.buildSync({
                    entryPoints: [tempSfcFilePath],
                    bundle: true,
                    write: false,
                    format: 'esm',
                    external: Array.from(externals) as string[]
                })

                fs.rmSync(tempScriptPath)
                fs.rmSync(tempTemplatePath)
                fs.rmSync(tempStylePath)
                fs.rmSync(tempSfcFilePath)

                if (result.outputFiles) {
                    for (const out of result.outputFiles) {
                        code = out.text
                    }
                }

                break
            }

            default:
                code = fileContent
        }

        if (!isBundle) {
            const [imports] = esModuleLexerParse(code)

            for (let i = imports.length - 1; i >= 0; i--) {
                const importItem = imports[i]

                if (!importItem.n || importItem.n.startsWith('/') || importItem.n.startsWith('.')) {
                    continue
                }

                const bundleName = preBundle(importItem.n)
                code = code.substring(0, importItem.s) + bundleName + code.substring(importItem.e)
            }
        }

        codeCache.set(filePath, {
            isLibrary,
            content: code
        })
        content = code
    } catch (e) {
        console.log(e)
        isExist = false
    }
    return {
        isExist,
        isLibrary,
        content
    }
}

function initServerRoute() {
    server.get('/', async (_, reply) => {
        const entryHtmlPath = path.resolve(rootDir, 'index.html')
        let entryHtml = codeCache.has(entryHtmlPath)
            ? codeCache.get(entryHtmlPath)?.content
            : fs.readFileSync(entryHtmlPath, {
                  encoding: 'utf8'
              })

        entryHtml = `<script type="module" src="${specialFileNamePrefix}client/index.js"></script>${entryHtml}`
        codeCache.set(entryHtmlPath, {
            isLibrary: false,
            content: entryHtml ?? ''
        })
        reply.type('text/html')
        return entryHtml
    })
    server.setNotFoundHandler((req, res) => {
        const { isExist, isLibrary, content } = serveFile(req.url)

        res.headers({
            'content-type': 'application/javascript',
            'Cache-Control': isLibrary ? 'max-age=31536000,immutable' : ''
        })
            .code(isExist ? 200 : 404)
            .send(content)
    })
}

async function createServer() {
    try {
        const address = await server.listen({
            port: PORT,
            host: HOST
        })
        console.log(`Server listening on ${address}`)
        console.log(
            colors.dim(`ready in ${colors.bold(Math.ceil(performance.now() - startTime))} ms`)
        )
    } catch (err) {
        console.error(err)
        process.exit(1)
    }
}

function createHMRServer() {
    const server = new WebSocketServerRaw({
        host: HOST,
        port: HMR_PORT
    })

    let socket: WebSocket
    server.on('connection', (_socket) => {
        socket = _socket

        _socket.on('error', (err) => {
            console.error(`[hrm error] ${err}`)
        })

        _socket.on('message', function message(data) {
            console.log('received: %s', data)
        })

        _socket.send(JSON.stringify({ type: 'connected' }))
    })

    hmrServer = {
        send(type: HMRType, message = {}) {
            socket.send(
                JSON.stringify({
                    type,
                    message
                })
            )
        }
    }
}

function watchFileChange() {
    chokidar
        .watch(rootDir, {
            ignored: path.resolve(rootDir, 'node_modules'),
            ignoreInitial: true
        })
        .on('all', (event, path) => {
            if (path.endsWith('.html')) {
                console.log('full reload')
                hmrServer.send('full-reload')
            } else {
                console.log('file changed:', path)
                if (codeCache.has(path)) {
                    console.log(`${path} 缓存失效.`)
                    codeCache.delete(path)
                }
            }
        })
}

async function init() {
    console.log(`> ${rootDir} dev`)

    createDir(cacheDir)
    createDir(cacheDepDir)

    initServerRoute()
    await createServer()
    createHMRServer()
    watchFileChange()
}

init()
