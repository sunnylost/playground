import { WebSocketServer  } from 'ws'

const wss= new WebSocketServer({
    port:9999
})

wss.on('open', ()=>{
    console.log('open')
})

wss.on('connection', (ws) => {
    console.log('client connected')
    ws.on('message', (message) => {
        console.log(message)
    })

    setTimeout(() => {
        ws.send('message from server.')
    }, 3000)
})
