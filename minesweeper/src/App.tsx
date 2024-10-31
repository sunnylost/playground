import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useEffect } from 'react'
import { Field, Levels, TopBar } from './components'
import { INIT, fieldsReducerAtom, gameConfigAtom, gameStatusAtom } from './states'

function App() {
    const gameConfig = useAtomValue(gameConfigAtom)
    const [gameStatus, setGameStatus] = useAtom(gameStatusAtom)
    const dispatch = useSetAtom(fieldsReducerAtom)

    useEffect(() => {
        dispatch({
            type: INIT,
            payload: gameConfig
        })
        setGameStatus(INIT)
    }, [dispatch, gameConfig, setGameStatus])

    return (
        <div className={`main game-${gameStatus}`}>
            <Levels />
            <TopBar />
            <Field />
        </div>
    )
}

export default App
