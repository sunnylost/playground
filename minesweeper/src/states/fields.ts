import { atom } from 'jotai'
import { atomWithReducer } from 'jotai/utils'
import { CLICK, INIT, MARK, RESET } from './const'

export type Fields = FieldItem[]

export type FieldItem = {
    key: string
    cells: CellState[]
}

export type CellState = {
    row: number
    col: number
    isMine: boolean
    isOpened: boolean
    isMarked: boolean
    hint: number
}

export function generateFields(gameConfig: [number, number, number]) {
    const [row, col, mines] = gameConfig
    const fields: FieldItem[] = []

    let minesNum = 0
    for (let i = 0; i < row; i++) {
        const rows: FieldItem = {
            key: `row-${i}`,
            cells: []
        }
        fields.push(rows)

        for (let j = 0; j < col; j++) {
            let isMine = Math.random() > 0.5

            if (minesNum < mines) {
                if (isMine) {
                    minesNum++
                }
            } else {
                isMine = false
            }

            rows.cells.push({
                row: i,
                col: j,
                isMine,
                isOpened: false,
                isMarked: false,
                hint: 0
            })
        }
    }

    return fields
}

const directions = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1]
]

export function generateSurroundPosition(fields: Fields, row: number, col: number) {
    const positions = []

    for (const [dx, dy] of directions) {
        const newRow = row + dx
        const newCol = col + dy

        if (
            newRow >= 0 &&
            newRow < fields.length &&
            newCol >= 0 &&
            newCol < fields[0].cells.length
        ) {
            positions.push([newRow, newCol])
        }
    }

    return positions
}

export function generateHints(fields: Fields, row: number, col: number) {
    return generateSurroundPosition(fields, row, col).reduce((acc, [newRow, newCol]) => {
        const cell = fields[newRow].cells[newCol]
        return acc + (cell.isMine ? 1 : 0)
    }, 0)
}

export function flipZeroCell(fields: Fields, row: number, col: number) {
    const checkedMaps = {
        [`${row},${col}`]: true
    }
    const checkCells = generateSurroundPosition(fields, row, col).filter(([newRow, newCol]) => {
        const isPass = !checkedMaps[`${newRow},${newCol}`]
        checkedMaps[`${newRow},${newCol}`] = true
        return isPass
    })

    while (checkCells.length) {
        const temp = checkCells.pop()

        if (!temp) {
            break
        }

        const [newRow, newCol] = temp
        const cell = fields[newRow].cells[newCol]

        if (!cell.isMine && !cell.isOpened) {
            const hint = generateHints(fields, newRow, newCol)

            cell.isOpened = true
            cell.hint = hint

            if (hint === 0) {
                checkCells.push(
                    ...generateSurroundPosition(fields, newRow, newCol).filter(
                        ([newRow, newCol]) => {
                            const isPass = !checkedMaps[`${newRow},${newCol}`]
                            checkedMaps[`${newRow},${newCol}`] = true
                            return isPass
                        }
                    )
                )
            }
        }
    }
    return fields
}

export function updateCell(
    fields: Fields,
    row: number,
    col: number,
    fn: (cell: CellState) => CellState
) {
    return fields.map((field, i) => {
        if (i === row) {
            return {
                ...field,
                cells: field.cells.map((cell) => {
                    if (cell.col === col) {
                        return fn(cell)
                    } else {
                        return cell
                    }
                })
            }
        } else {
            return field
        }
    })
}

type ActionType = typeof INIT | typeof RESET | typeof CLICK | typeof MARK
type Action = {
    type: ActionType
    payload?: unknown
}

function fieldsReducer(prev: Fields, action: Action) {
    switch (action.type) {
        case 'init':
        case 'reset':
            return generateFields(action.payload as [number, number, number])

        case 'click': {
            const { row, col } = action.payload as { row: number; col: number }
            const cell = prev[row].cells[col]

            if (!cell.isOpened) {
                const hint = generateHints(prev, row, col)

                prev = updateCell(prev, row, col, (cell) => ({
                    ...cell,
                    isOpened: true,
                    hint
                }))

                if (hint === 0) {
                    return flipZeroCell(prev, row, col).map((field) => ({
                        ...field,
                        cells: field.cells.map((cell) => ({
                            ...cell
                        }))
                    }))
                }
            }

            break
        }

        case 'mark': {
            const { row, col } = action.payload as { row: number; col: number }
            return updateCell(prev, row, col, (cell) => ({
                ...cell,
                isMarked: true
            }))
        }

        default:
            break
    }

    return prev
}

export const fieldsReducerAtom = atomWithReducer([], fieldsReducer)
