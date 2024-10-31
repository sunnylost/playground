import { useAtom, useSetAtom } from 'jotai'
import { useCallback, useEffect, useState } from 'react'
import {
    CLICK,
    type CellState,
    FAIL,
    MARK,
    SUCCESS,
    fieldsReducerAtom,
    gameStatusAtom
} from '../states'

export function Cell({ row, col, isMine, isOpened, isMarked, hint }: CellState) {
    const dispatch = useSetAtom(fieldsReducerAtom)
    const [gameStatus, setGameStatus] = useAtom(gameStatusAtom)
    const [cellClass, setCellClass] = useState('')
    const [isBoom, setIsBoom] = useState(false)

    const isGameFinished = useCallback(
        () => gameStatus === SUCCESS || gameStatus === FAIL,
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

    function handleClick() {
        if (isOpened || isGameFinished()) {
            return
        }

        if (isMine) {
            setIsBoom(true)
            setGameStatus(FAIL)
        }

        dispatch({
            type: CLICK,
            payload: {
                row,
                col
            }
        })
    }

    function handleContextMenu(e: MouseEvent) {
        if (isOpened || isGameFinished()) {
            return
        }

        e.preventDefault()
        dispatch({
            type: MARK,
            payload: {
                row,
                col
            }
        })
    }

    return (
        <div
            className={`cell ${cellClass}`}
            onClick={() => handleClick()}
            onContextMenu={(e) => handleContextMenu(e)}
        >
            {hint !== 0 && !isMine && (
                <i
                    style={{
                        '--digit': hint
                    }}
                />
            )}
        </div>
    )
}
