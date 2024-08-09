let isInitialized = false;

function initWebSocket() {
    if (isInitialized) {
        return
    }

    isInitialized = true
    const ws = new WebSocket('ws://localhost:9999')

    ws.onopen = () => {
        sendMessage('open')
    }

    ws.onmessage = message => {
        sendMessage(message.data)
    }
}

function sendMessage(message) {
    for (const port of ports) {
        port.postMessage(message)
    }
}

function sendMessageToOthers(owner, message) {
    for (const port of ports) {
        if (port !== owner) {
            port.postMessage(message)
        }
    }
}

/**
 * @type {Set<MessagePort>}
 */
const ports = new Set

self.onconnect = e => {
    const port = e.ports[0]
    ports.add(port)

    port.onmessage = e => {
        sendMessageToOthers(port, e.data)
    }

    initWebSocket()
}
