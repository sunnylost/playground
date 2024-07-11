const ws = new WebSocket('ws://localhost:9090')

ws.addEventListener('error', console.error)

ws.addEventListener('open', () => {
    console.log('connect!')
})

ws.addEventListener('close', () => {
    console.log('close!')
})

ws.addEventListener('message', async ({ data }) => {
    try {
        const { type, updates } = JSON.parse(data)

        switch (type) {
            case 'connected':
                break

            case 'full-reload':
                reload()
                break

            // js-update | css-update
            case 'update':
                await fetchUpdate(updates)
                break

            default:
                console.warn(`[hmr] unknown type: ${type}`)
                break
        }
    } catch (error) {
        console.log(`[hmr] error: ${error}`)
    }
})

let reloadTimer
function reload() {
    clearTimeout(reloadTimer)
    reloadTimer = setTimeout(() => {
        location.reload()
    }, 50)
}

const hotModulesMap = new Map()

async function fetchUpdate(updates) {
    return Promise.all(
        updates.map((update) => {
            const importPromise = import(`${update.path}?${Date.now()}`, {})

            importPromise.catch(() => {
                reload()
            })
            return importPromise.then((fetchedModule) => {
                const mod = hotModulesMap.get(update.path)

                if (!mod) {
                    return
                }

                for (const callback of mod.callbacks) {
                    callback?.fn([fetchedModule])
                }
            })
        })
    )
}

class HMRContext {
    ownerPath = ''

    constructor(ownerPath) {
        this.ownerPath = ownerPath

        const mod = hotModulesMap.get(ownerPath)

        if (mod) {
            mod.callbacks = []
        }
    }

    accept(deps, callback) {
        if (typeof deps === 'function' || !deps) {
            // self-accept: hot.accept(() => {})
            this.acceptDeps([this.ownerPath], ([mod]) => deps?.(mod))
        } else if (typeof deps === 'string') {
            // explicit deps
            this.acceptDeps([deps], ([mod]) => callback?.(mod))
        } else if (Array.isArray(deps)) {
            this.acceptDeps(deps, callback)
        } else {
            throw new Error(`invalid hot.accept() usage.`)
        }
    }

    acceptDeps(deps, callback) {
        const mod = hotModulesMap.get(this.ownerPath) || {
            id: this.ownerPath,
            callbacks: []
        }
        mod.callbacks.push({
            deps,
            fn: callback
        })
        hotModulesMap.set(this.ownerPath, mod)
    }
}

export function createHotContext(ownerPath) {
    return new HMRContext(ownerPath)
}
