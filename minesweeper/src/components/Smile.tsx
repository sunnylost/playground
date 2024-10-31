import { useAtom, useAtomValue } from 'jotai'
import { useSetAtom } from 'jotai/index'
import { useEffect, useState } from 'react'
import {
    FAIL,
    type GameStatus,
    INIT,
    SUCCESS,
    fieldsReducerAtom,
    gameConfigAtom,
    gameStatusAtom
} from '../states'

function isFinished(gameStatus: GameStatus) {
    return gameStatus === FAIL || gameStatus === SUCCESS
}

export function Smile() {
    const gameConfig = useAtomValue(gameConfigAtom)
    const dispatch = useSetAtom(fieldsReducerAtom)
    const [gameStatus, setGameStatus] = useAtom(gameStatusAtom)
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
        setGameStatus(INIT)
        dispatch({
            type: INIT,
            payload: gameConfig
        })
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
