import { useEffect, useState } from 'react'
import { useAppContext } from '../state'

export function Smile() {
    const state = useAppContext()
    const [iconState, setIconState] = useState('normal')
    const [isPressed, setIsPressed] = useState(false)

    useEffect(() => {
        if (!state) {
            return
        }

        if (state.state !== 'init') {
            setIconState('fail')
            return
        }

        if (isPressed) {
            setIconState('pressed')
        } else {
            setIconState('normal')
        }
    }, [state, isPressed])

    function handlePointerDown() {
        if (!state || state.state !== 'init') {
            return
        }

        setIsPressed(true)
    }

    function handlePointerUp() {
        setIsPressed(false)
    }

    return (
        <div
            className={`smile ${iconState}`}
            onPointerDown={() => handlePointerDown()}
            onPointerOut={() => handlePointerUp()}
            onPointerUp={() => handlePointerUp()}
        ></div>
    )
}
