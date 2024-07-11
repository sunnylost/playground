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
import {
    type SFCDescriptor,
    compileScript,
    compileStyle,
    compileTemplate,
    parse as sfcParse
} from 'vue/compiler-sfc'
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
// handle vue file
const descriptorCache = new Map()
const bundleNameMap = new Map<string, [string, string]>()
const bundleNamePrefix = '/@bundleModule/'
const specialFileNamePrefix = '/@specialModule/'
const externals = new Set<string>()
const server = Fastify()

type HMRType = 'connect' | 'full-reload' | 'update'

let hmrServer: {
    send: (type: HMRType, updates?: object) => void
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

function getHash(content: string) {
    return createHash('sha256').update(content).digest('hex').substring(0, 8)
}

function createTempFile(content = '') {
    const tempFileName = `temp-${getHash(content)}.js`
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
    const bundleName = `bundle-${getHash(moduleName)}.js`
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

function getDescriptor(
    fileContent: string,
    filePath: string
): SFCDescriptor & {
    id: string
} {
    const { descriptor } = sfcParse(fileContent)

    return {
        ...descriptor,
        id: getHash(filePath)
    }
}

function serveFile(rawURL: string) {
    let filePath = ''
    let isBundle = false
    let isLibrary = false
    let isExist = true
    let content = ''

    const { pathname } = new URL(rawURL, 'http://localhost')

    if (pathname.startsWith(bundleNamePrefix)) {
        isBundle = true
        isLibrary = true
        filePath = bundleNameMap.get(pathname.replace(bundleNamePrefix, ''))?.[0] ?? ''
    } else if (pathname.startsWith(specialFileNamePrefix)) {
        isBundle = false
        isLibrary = true
        filePath = path.resolve(currentDir, pathname.replace(specialFileNamePrefix, ''))
    } else {
        filePath = path.resolve(rootDir, path.isAbsolute(pathname) ? `.${pathname}` : pathname)
    }

    if (codeCache.has(filePath)) {
        const cache = codeCache.get(filePath)

        return {
            isExist: true,
            isLibrary: cache?.isLibrary,
            content: cache?.content
        }
    }

    try {
        const ext = path.extname(pathname)
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
                const descriptor = getDescriptor(fileContent, filePath)
                descriptorCache.set(filePath, descriptor)
                const scopeId = `v-${descriptor.id}`

                const { content: compiledScript, bindings } = compileScript(descriptor, {
                    id: scopeId
                })
                const { code: compiledTemplate } = compileTemplate({
                    filename: filePath,
                    id: scopeId,
                    source: descriptor.template?.content ?? '',
                    compilerOptions: {
                        bindingMetadata: bindings
                    }
                })

                const compiledStyle = descriptor.styles
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
                sfc_main.__scopeId = 'data-${scopeId}';
                sfc_main.__hmrId = '${scopeId}';
                
                typeof __VUE_HMR_RUNTIME__ !== 'undefined' && __VUE_HMR_RUNTIME__.createRecord(sfc_main.__hmrId, sfc_main);
                
                // TODO: check if the template is the only thing that changed
                // export const _rerender_only = true;
                
                import.meta.hot.accept((mod) => {
                      if (!mod) return;
                      const { default: updated, _rerender_only } = mod;
                      if (_rerender_only) {
                            __VUE_HMR_RUNTIME__.rerender(updated.__hmrId, updated.render);
                      } else {
                            __VUE_HMR_RUNTIME__.reload(updated.__hmrId, updated);
                      }
                });
        
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

                code = `import { createHotContext as __createHotContext } from '/@specialModule/client/index.js';
                import.meta.hot = __createHotContext("${pathname}");
                ${code}`

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
        send(type: HMRType, updates = {}) {
            socket.send(
                JSON.stringify({
                    type,
                    updates
                })
            )
        }
    }
}

function isTemplateChanged(preDescriptor: SFCDescriptor, descriptor: SFCDescriptor) {
    return preDescriptor.template?.content !== descriptor.template?.content
}

function isScriptChanged(preDescriptor: SFCDescriptor, descriptor: SFCDescriptor) {
    return preDescriptor.script?.content !== descriptor.script?.content
}

function isStyleChanged(preDescriptor: SFCDescriptor, descriptor: SFCDescriptor) {
    const oldStyles = preDescriptor.styles
    const newStyles = descriptor.styles

    return (
        oldStyles.length !== newStyles.length ||
        !oldStyles.every((styleBlock, i) => newStyles[i].content === styleBlock.content)
    )
}

function handleHMRUpdate(event: 'change', filePath: string) {
    const shortPath = path.relative(rootDir, filePath)

    console.log(`[file change] ${shortPath}`)

    if (shortPath.endsWith('.vue')) {
        const preDescriptor = descriptorCache.get(filePath)
        const descriptor = getDescriptor(fs.readFileSync(filePath, { encoding: 'utf8' }), filePath)

        if (
            isScriptChanged(preDescriptor, descriptor) ||
            isTemplateChanged(preDescriptor, descriptor) ||
            isStyleChanged(preDescriptor, descriptor)
        ) {
            descriptorCache.set(filePath, descriptor)
            hmrServer.send('update', [
                {
                    type: 'js-update',
                    path: `/${shortPath}`
                }
            ])
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
                hmrServer.send('full-reload')
            } else {
                if (codeCache.has(path)) {
                    codeCache.delete(path)
                }

                if (event === 'change') {
                    handleHMRUpdate('change', path)
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
