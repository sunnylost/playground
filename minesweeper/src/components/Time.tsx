import { useAtomValue } from 'jotai/index'
import { useEffect, useState } from 'react'
import { BEGIN, gameStatusAtom } from '../states'
import { Display } from './Display'

export function Time() {
    const gameStatus = useAtomValue(gameStatusAtom)
    const [timeCount, setTimeCount] = useState(0)
    const [timerId, setTimerId] = useState(0)

    useEffect(() => {
        clearTimeout(timerId)

        if (gameStatus === BEGIN) {
            const timeoutID = window.setInterval(() => {
                setTimeCount((value) => value + 1)
            }, 1000)

            setTimerId(timeoutID)
        }

        return () => {
            clearInterval(timerId)
            setTimerId(0)
        }
    }, [gameStatus])

    return <Display value={timeCount} />
}
