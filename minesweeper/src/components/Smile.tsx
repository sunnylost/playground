import { useEffect, useState } from 'react'
import {
    type GameStatus,
    STATUS_FAIL,
    STATUS_SUCCESS,
    useGameStatus,
    useGameStore
} from '../states'

function isFinished(gameStatus: GameStatus) {
    return gameStatus === STATUS_FAIL || gameStatus === STATUS_SUCCESS
}

export function Smile() {
    const gameStatus = useGameStatus()
    const initGame = useGameStore((state) => state.start)
    const [iconState, setIconState] = useState('normal')
    const [isPressed, setIsPressed] = useState(false)

    useEffect(() => {
        if (isFinished(gameStatus)) {
            setIconState(gameStatus)
            return
        }

        if (isPressed) {
            setIconState('pressed')
        } else {
            setIconState('normal')
        }
    }, [gameStatus, isPressed])

    function handlePointerDown() {
        if (isFinished(gameStatus)) {
            return
        }

        setIsPressed(true)
    }

    function handlePointerUp() {
        setIsPressed(false)
        initGame()
    }

    return (
        <div
            className={`smile ${iconState}`}
            onPointerDown={() => handlePointerDown()}
            onPointerOut={() => handlePointerUp()}
            onPointerUp={() => handlePointerUp()}
        />
    )
}
