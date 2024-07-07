import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import chokidar from 'chokidar'
import { init, parse } from 'es-module-lexer'
import esbuild from 'esbuild'
import Fastify from 'fastify'
import { compileScript, compileStyle, compileTemplate, parse as sfcParse } from 'vue/compiler-sfc'

await init

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(currentDir, process.argv.slice(-1)[0])
const cacheDir = path.resolve(rootDir, './node_modules/.mini-vite-cache')
const codeCache = new Map<string, string>()
const bundleNameMap = new Map<string, [string, string]>()
const bundleNamePrefix = '/@bundleModule/'
const externals = new Set<string>()

console.log(`Serving ${rootDir}...`)

try {
    fs.statSync(cacheDir)
} catch {
    fs.mkdirSync(cacheDir)
}

const server = Fastify()

server.get('/', async (_, reply) => {
    const entryHtmlPath = path.resolve(rootDir, 'index.html')
    const entryHtml = codeCache.has(entryHtmlPath)
        ? codeCache.get(entryHtmlPath)
        : fs.readFileSync(entryHtmlPath, {
              encoding: 'utf8'
          })
    codeCache.set(entryHtmlPath, entryHtml ?? '')
    reply.type('text/html')
    return entryHtml
})

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

const hash = createHash('sha256')
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
    let isExist = true
    let content = ''

    if (url.startsWith(bundleNamePrefix)) {
        isBundle = true
        filePath = bundleNameMap.get(url.replace(bundleNamePrefix, ''))?.[0] ?? ''
    } else {
        filePath = path.resolve(rootDir, path.isAbsolute(url) ? `.${url}` : url)
    }

    if (codeCache.has(filePath)) {
        return {
            isExist: true,
            content: codeCache.get(filePath)
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
                console.log(tempStylePath, 'tempStylePath')
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
            const [imports] = parse(code)

            for (let i = imports.length - 1; i >= 0; i--) {
                const importItem = imports[i]

                if (!importItem.n || importItem.n.startsWith('/') || importItem.n.startsWith('.')) {
                    continue
                }

                const bundleName = preBundle(importItem.n)
                code = code.substring(0, importItem.s) + bundleName + code.substring(importItem.e)
            }
        }

        codeCache.set(filePath, code)
        content = code
    } catch (e) {
        console.log(e)
        isExist = false
    }
    return {
        isExist,
        content
    }
}

server.setNotFoundHandler((req, res) => {
    const { isExist, content } = serveFile(req.url)
    res.header('content-type', 'application/javascript')
        .code(isExist ? 200 : 404)
        .send(content)
})

try {
    const address = await server.listen({
        port: 8080
    })
    console.log(`Server listening on ${address}`)
} catch (err) {
    console.error(err)
    process.exit(1)
}

/**
 * 监听文件变动
 */
chokidar
    .watch(rootDir, {
        ignored: 'node_modules/*',
        ignoreInitial: true
    })
    .on('all', (event, path) => {
        if (codeCache.has(path)) {
            console.log(`${path} 缓存失效.`)
            codeCache.delete(path)
        }
    })
