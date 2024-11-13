import { produce } from 'immer'
import { create } from 'zustand'
import { combine } from 'zustand/middleware'

export const STATUS_INIT = 'init'
export const STATUS_BEGIN = 'begin'
export const STATUS_CHECKING = 'checking'
export const STATUS_SUCCESS = 'success'
export const STATUS_FAIL = 'fail'

export const LEVEL_BEGINNER = 0
export const LEVEL_INTERMEDIATE = 1
export const LEVEL_EXPERT = 2

export type Level = typeof LEVEL_BEGINNER | typeof LEVEL_INTERMEDIATE | typeof LEVEL_EXPERT
export type GameStatus =
    | typeof STATUS_INIT
    | typeof STATUS_BEGIN
    | typeof STATUS_CHECKING
    | typeof STATUS_SUCCESS
    | typeof STATUS_FAIL

type Game = {
    status: GameStatus
    level: Level
    fields: Fields
}

export const LevelList = [
    {
        name: 'Beginner',
        value: LEVEL_BEGINNER
    },
    {
        name: 'Intermediate',
        value: LEVEL_INTERMEDIATE
    },
    {
        name: 'Expert',
        value: LEVEL_EXPERT
    }
] as { name: string; value: Level }[]
export const LevelConfig: [row: number, col: number, mines: number][] = [
    [8, 8, 10],
    [16, 16, 40],
    [16, 30, 99]
] as const

export type Fields = FieldItem[]

export type FieldItem = {
    key: string
    cells: Cell[]
}

export type Cell = {
    row: number
    col: number
    isMine: boolean
    isOpened: boolean
    isMarked: boolean
    hint: number // neighbour mines count
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

/**
 * generate mines randomly
 * @param gameConfig
 */
export function generateFields([row, col, mines]: [number, number, number]) {
    const fields: FieldItem[] = Array.from(
        {
            length: row
        },
        (_, r) => ({
            key: `row-${r}`,
            cells: Array.from(
                {
                    length: col
                },
                (_, c) => ({
                    row: r,
                    col: c,
                    isMine: false,
                    isOpened: false,
                    isMarked: false,
                    hint: 0
                })
            )
        })
    )

    let minesPlaced = 0

    while (minesPlaced < mines) {
        const r = (Math.random() * row) >>> 0
        const c = (Math.random() * col) >>> 0

        if (!fields[r].cells[c].isMine) {
            fields[r].cells[c].isMine = true
            minesPlaced++
        }
    }

    for (let i = 0; i < row; i++) {
        const rows: FieldItem = fields[i]

        for (let j = 0; j < col; j++) {
            const cell = rows.cells[j]

            if (cell.isMine) {
                continue
            }

            for (const [dRow, dCol] of directions) {
                const newRow = i + dRow
                const newCol = j + dCol

                if (
                    newRow > 0 &&
                    newRow < row &&
                    newCol > 0 &&
                    newCol < col &&
                    fields[newRow].cells[newCol].isMine
                ) {
                    cell.hint++
                }
            }
        }
    }

    return fields
}

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

export function updateCell(fields: Fields, row: number, col: number, fn: (cell: Cell) => Cell) {
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

type State = {
    status: GameStatus
    level: Level
    fields: Fields
    remains: number
}

type Action = {
    init: (level?: Level) => void
    click: (row: number, col: number) => void
    mark: (row: number, col: number) => void
    start: () => void
    success: () => void
    fail: () => void
}

export const useGameStore = create(
    combine(
        {
            status: STATUS_INIT,
            level: LEVEL_BEGINNER,
            fields: []
        } as Game,
        (set, get) => ({
            setStatus: (status: GameStatus) =>
                set((state) => ({
                    ...state,
                    status
                })),

            setLevel: (level: Level) =>
                set((state) => ({
                    ...state,
                    level
                })),

            start: () => {
                set((state) => ({
                    ...state,
                    fields: generateFields(LevelConfig[state.level]),
                    status: STATUS_BEGIN
                }))
            },

            fail: () => {
                console.log('game failed')
                set((state) => ({
                    ...state,
                    status: STATUS_FAIL
                }))
            },

            openField: (row: number, col: number) => {
                const cell = get().fields[row].cells[col]

                if (cell.isOpened) {
                    return
                }

                set(
                    produce((state: Game) => {
                        const cell = state.fields[row].cells[col]
                        cell.isOpened = true

                        if (cell.isMine) {
                            state.status = STATUS_FAIL
                        }
                    })
                )
            },

            markField: (row: number, col: number) => {
                const cell = get().fields[row].cells[col]

                if (cell.isOpened) {
                    return
                }

                set(
                    produce((state: Game) => {
                        state.fields[row].cells[col].isMarked = true
                    })
                )
            }
        })
    )
)

export const useGameStatus = () => useGameStore((state) => state.status)

export const useGameFields = () => useGameStore((state) => state.fields)

export const useOpenField = () => useGameStore((state) => state.openField)

export const useMarkField = () => useGameStore((state) => state.markField)
