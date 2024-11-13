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

function iterateDirections(row: number, col: number, fields: Fields, fn: (cell: Cell) => void) {
    for (const [dRow, dCol] of directions) {
        const newRow = row + dRow
        const newCol = col + dCol

        if (
            newRow >= 0 &&
            newRow < fields.length &&
            newCol >= 0 &&
            newCol < fields[0].cells.length
        ) {
            fn(fields[newRow].cells[newCol])
        }
    }
}

/**
 * generate mines randomly
 * @param gameConfig
 */
function generateFields([row, col, mines]: [number, number, number]) {
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

            iterateDirections(i, j, fields, (c) => {
                if (c.isMine) {
                    cell.hint++
                }
            })
        }
    }

    return fields
}

function openEmptyCell(
    row: number,
    col: number,
    fields: Fields,
    checkedCells: Record<string, boolean> = {}
) {
    const cell = fields[row].cells[col]

    checkedCells[`${row}-${col}`] = true
    cell.isOpened = true

    iterateDirections(row, col, fields, (c) => {
        if (c.hint === 0 && !c.isMine && !checkedCells[`${c.row}-${c.col}`]) {
            openEmptyCell(c.row, c.col, fields, checkedCells)
        }
    })
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
                        } else {
                            openEmptyCell(row, col, state.fields)
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
