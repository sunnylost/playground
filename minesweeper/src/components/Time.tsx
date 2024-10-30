import { useEffect, useState } from 'react'
import { useAppContext } from '../state'
import { Display } from './Display'

export function Time() {
    const ctx = useAppContext()
    const [timeCount, setTimeCount] = useState(0)
    const [timerId, setTimerId] = useState(0)

    useEffect(() => {
        console.log('ctx', ctx)
    }, [ctx])

    useEffect(() => {
        clearTimeout(timerId)
        const timeoutID = window.setInterval(() => {
            setTimeCount((value) => value + 1)
        }, 1000)

        setTimerId(timeoutID)

        return () => {
            clearInterval(timeoutID)
            setTimerId(0)
        }
    }, [])

    return <Display value={timeCount} />
}
