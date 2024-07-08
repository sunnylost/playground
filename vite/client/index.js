const ws = new WebSocket('ws://localhost:9090')

ws.addEventListener('error', console.error)

ws.addEventListener('open', () => {
    console.log('connect!')
})

ws.addEventListener('close', () => {
    console.log('close!')
})

ws.addEventListener('message', ({ data }) => {
    try {
        const { type, content } = JSON.parse(data)

        switch (type) {
            case 'full-reload':
                reload()
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
