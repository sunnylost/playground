import { createEffect, createSignal } from './index.ts'

const [count, setCount] = createSignal(0)

createEffect(() => {
    console.log('count1 = ', count())

    createEffect(() => {
        console.log('count2 = ', count())
    })
})

setTimeout(() => {
    console.log('first change')
    setCount((prev) => prev + 1)

    setTimeout(() => {
        console.log('second change')
        setCount((prev) => prev + 1)
    }, 2000)
}, 1000)
