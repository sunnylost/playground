import { useAtomValue } from 'jotai'
import { gameLevelAtom } from '../states'
import { Display } from './Display.tsx'

export function Count() {
    const gameLevel = useAtomValue(gameLevelAtom)

    return <Display value={gameLevel} />
}
