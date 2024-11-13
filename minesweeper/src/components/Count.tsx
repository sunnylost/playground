import { useGameStore } from '../states'
import { Display } from './Display.tsx'

export function Count() {
    const gameLevel = useGameStore((state) => state.level)

    return <Display value={gameLevel} />
}
