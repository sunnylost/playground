import { useCallback, useEffect, useState } from 'react'
import {
    type Cell,
    STATUS_FAIL,
    STATUS_SUCCESS,
    useGameStatus,
    useMarkField,
    useOpenField
} from '../states'

export function Cell({ row, col, isMine, isOpened, isMarked, hint }: Cell) {
    const gameStatus = useGameStatus()
    const openField = useOpenField()
    const markField = useMarkField()
    const [cellClass, setCellClass] = useState('')
    const [isBoom, setIsBoom] = useState(false)

    // TODO: move to store
    const isGameFinished = useCallback(
        () => gameStatus === STATUS_SUCCESS || gameStatus === STATUS_FAIL,
        [gameStatus]
    )

    useEffect(
        () =>
            setCellClass(
                [isOpened && 'opened', isMine && 'mine', isMarked && 'marked', isBoom && 'boomed']
                    .filter(Boolean)
                    .join(' ')
            ),
        [isMine, isOpened, isMarked, isBoom]
    )

    const handleClick = useCallback(() => {
        if (isOpened || isGameFinished()) {
            return
        }

        if (isMine) {
            setIsBoom(true)
        }

        openField(row, col)
    }, [isOpened, isMine, openField, isGameFinished, row, col])

    const handleContextMenu = useCallback(
        (e: MouseEvent) => {
            e.preventDefault()

            if (isOpened || isGameFinished()) {
                return
            }

            markField(row, col)
        },
        [isOpened, isGameFinished, markField, col, row]
    )

    return (
        <div
            className={`cell ${cellClass}`}
            onClick={() => handleClick()}
            onKeyUp={() => {}}
            onContextMenu={(e) => handleContextMenu(e as unknown as MouseEvent)}
        >
            {hint !== 0 && !isMine && isOpened && (
                <i
                    style={{
                        '--digit': hint
                    }}
                />
            )}
        </div>
    )
}
