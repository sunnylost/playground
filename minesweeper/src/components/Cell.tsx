import { useEffect, useState } from 'react'
import { CellState, useAppContext } from '../state'

export function Cell({ row, col, isMine, isOpened, hint }: CellState) {
    const [cellClass, setCellClass] = useState('')
    const ctx = useAppContext()

    useEffect(
        () => setCellClass([isOpened && 'opened', isMine && 'mine'].filter(Boolean).join(' ')),
        [isMine, isOpened]
    )

    function handleClick() {
        if (isOpened) {
            return
        }

        ctx?.dispatch?.({
            type: 'click',
            payload: {
                row,
                col
            }
        })
    }

    return (
        <div className={`cell ${cellClass}`} onClick={() => handleClick()}>
            {hint !== 0 && (
                <i
                    style={{
                        '--digit': hint
                    }}
                />
            )}
        </div>
    )
}
