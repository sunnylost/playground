import { useSetAtom } from 'jotai'
import { LevelList, gameLevelAtom } from '../states'

export function Levels() {
    const setGameLevel = useSetAtom(gameLevelAtom)

    return (
        <select>
            {LevelList.map((level) => (
                <option key={level.name} onKeyUp={() => setGameLevel(level.value)}>
                    {level.name}
                </option>
            ))}
        </select>
    )
}
