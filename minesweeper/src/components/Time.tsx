import { useEffect, useRef, useState } from 'react'
import { STATUS_BEGIN, useGameStatus } from '../states'
import { Display } from './Display'

export function Time() {
    const gameStatus = useGameStatus()
    const [timeCount, setTimeCount] = useState(0)
    const timerIdRef = useRef(0)

    useEffect(() => {
        clearTimeout(timerIdRef.current)

        if (gameStatus === STATUS_BEGIN) {
            timerIdRef.current = window.setInterval(() => {
                setTimeCount((value) => value + 1)
            }, 1000)
        }

        return () => {
            clearInterval(timerIdRef.current)
            setTimeCount(0)
        }
    }, [gameStatus])

    return <Display value={timeCount} />
}
