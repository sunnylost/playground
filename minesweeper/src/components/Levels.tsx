import { LevelList, useGameStore } from '../states'

export function Levels() {
    const startGame = useGameStore((state) => state.start)

    return (
        <select name="level">
            {LevelList.map((level) => (
                <option key={level.name} onPointerUp={() => startGame()}>
                    {level.name}
                </option>
            ))}
        </select>
    )
}
