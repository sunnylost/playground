import { useEffect } from 'react'
import { Field, Levels, TopBar } from './components'
import { useGameStatus, useGameStore } from './states'

function App() {
    const gameStatus = useGameStatus()
    const startGame = useGameStore((state) => state.start)

    useEffect(() => {
        startGame()
    }, [startGame])

    return (
        <div className={`main game-${gameStatus}`}>
            <Levels />
            <TopBar />
            <Field />
        </div>
    )
}

export default App
