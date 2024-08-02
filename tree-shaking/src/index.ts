import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import {
    AnonymousFunctionDeclaration,
    ArrowFunctionExpression,
    FunctionExpression,
    Identifier,
    Parser
} from 'acorn'
import type {
    Node,
    ExportDefaultDeclaration,
    ExportNamedDeclaration,
    FunctionDeclaration,
    VariableDeclaration
} from 'acorn'
import * as Walk from 'acorn-walk'

type StateResolver = (arg: boolean) => void
type State = {
    name: string
    isExported: boolean
    state: Promise<boolean>
    resolver: StateResolver
}
type ModuleStateItem = Record<string, State>
type HandledNode =
    | ExportDefaultDeclaration
    | ExportNamedDeclaration
    | FunctionDeclaration
    | VariableDeclaration
type HandleFunction =
    | FunctionDeclaration
    | AnonymousFunctionDeclaration
    | FunctionExpression
    | ArrowFunctionExpression

const moduleState = new Map<string, ModuleStateItem>()

function createState(name: string, isExported: boolean) {
    let resolver: StateResolver
    const promise = new Promise<boolean>((_resolve) => {
        resolver = _resolve
    })
    return {
        resolver(arg: boolean) {
            resolver(arg)
        },

        name,
        isExported,
        state: promise
    }
}

function isFunctionPure(state: ModuleStateItem, node: HandleFunction) {
    const params = node.params
    const localIdSet = new Set<string>()
    const usedIds: string[] = []

    params.forEach((n) => {
        localIdSet.add((n as Identifier).name)
    })

    Walk.simple(node.body, {
        Identifier(node) {
            usedIds.push(node.name)
        },

        VariableDeclaration(node) {
            node.declarations.forEach((n) => {
                localIdSet.add((n.id as Identifier).name)
            })
        },

        FunctionDeclaration(node) {
            localIdSet.add(node.id.name)
        },

        CallExpression(node) {
            // TODO
        }
    })

    let hasUnknownId = false

    for (let i = 0; i < usedIds.length; i++) {
        const id = usedIds[i]

        if (!localIdSet.has(id)) {
            hasUnknownId = true
            console.log(`not pure: unknown id ${id}`)
            break
        }
    }

    return hasUnknownId
}

function getFunctionDeclaration(node: HandledNode) {
    if (node.type === 'FunctionDeclaration') {
        return node
    }

    if ('declaration' in node && node.declaration.type === 'FunctionDeclaration') {
        return node.declaration
    }

    // TODO
    if ('declarations' in node) {
        const type = node.declarations[0].init.type

        if (type === 'FunctionExpression' || type === 'ArrowFunctionExpression') {
            return node.declarations[0].init
        }
    }
}

function analysisFunction(state: ModuleStateItem, node: HandledNode, name: string) {
    const declaration = getFunctionDeclaration(node)

    if (!declaration) {
        state[name].resolver(false)
        return
    }

    state[name].resolver(isFunctionPure(state, declaration))
}

function getNodeName(node: Node) {
    if (node.type === 'FunctionDeclaration') {
        return (node as FunctionDeclaration).id.name
    }

    if (node.type === 'VariableDeclaration') {
        return ((node as VariableDeclaration).declarations[0].id as Identifier).name
    }

    if (node.type === 'ExportNamedDeclaration') {
        return getNodeName((node as ExportNamedDeclaration).declaration)
    }

    return 'default' // ExportDefaultDeclaration
}

function isExported(node: Node) {
    return node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration'
}

export async function analysisFile(filePath: string) {
    if (moduleState.has(filePath)) {
        return moduleState.get(filePath)
    }

    const currentModuleState: ModuleStateItem = {}
    moduleState.set(filePath, currentModuleState)

    const usedExternalModule: Record<string, Set<string>> = {}
    const content = await readFile(filePath, 'utf8')
    const program = Parser.parse(content, {
        ecmaVersion: 'latest',
        sourceType: 'module'
    })

    program.body?.forEach((node) => {
        switch (node.type) {
            case 'ExportNamedDeclaration':
            case 'ExportDefaultDeclaration':
            case 'VariableDeclaration':
            case 'FunctionDeclaration':
                const name = getNodeName(node)

                currentModuleState[name] = createState(name, isExported(node))
                analysisFunction(currentModuleState, node, name)
                break

            case 'ImportDeclaration': {
                const importPath = resolve(dirname(filePath), node.source.value as string)
                // TODO: node.source.value
                analysisFile(importPath)
                if (!usedExternalModule[importPath]) {
                    usedExternalModule[importPath] = new Set()
                }

                node.specifiers.map((n) => {
                    if (n.type === 'ImportSpecifier') {
                        usedExternalModule[importPath].add((n.imported as Identifier).name)
                    } else if (n.type === 'ImportNamespaceSpecifier') {
                        usedExternalModule[importPath].add('default')
                    }
                })
                break
            }

            default:
                break
        }
    })

    // TODO
    setTimeout(() => {
        Object.entries(usedExternalModule).forEach(([key, value]) => {
            const ms = moduleState.get(key)
            const filteredMs = Object.keys(ms)
                .filter((k) => ms[k].isExported)
                .map((k) => ms[k])

            for (const v of value) {
                filteredMs.splice(filteredMs.indexOf(ms[v]), 1)
            }

            Promise.all(
                filteredMs.map((m, index) => m.state.then((v) => [index, v] as const))
            ).then(([...args]) => {
                args.forEach(([index, state]) => {
                    console.log(`${filteredMs[index].name} is ${state ? 'pured' : 'not pured'}.`)
                })
            })
        })
    }, 10)

    return currentModuleState
}
