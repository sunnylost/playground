import { ReactNode, createContext, useContext, useReducer } from 'react'

export const Beginner = 0
export const Intermediate = 1
export const Expert = 2
export type Level = typeof Beginner | typeof Intermediate | typeof Expert

type ActionType = 'init' | 'reset' | 'click' | 'mark'
type Action = {
    type: ActionType
    payload?: unknown
}
type State = 'init' | 'success' | 'fail'

export type CellState = {
    row: number
    col: number
    isMine: boolean
    isOpened: boolean
    isMarked: boolean
    hint: number
}

type FieldItem = {
    key: string
    cells: CellState[]
}

type AppState = {
    state: State
    level: Level
    count: number
    remain: number
    fields: FieldItem[]
}

const levelConfig: [row: number, col: number, mines: number][] = [
    [8, 8, 10],
    [16, 16, 40],
    [16, 30, 99]
] as const

function generateFields(level: Level) {
    const [row, col, mines] = levelConfig[level]
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

function end(state: AppState) {
    return {
        ...state,
        state: 'fail'
    }
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

function generateSurroundPosition(state: AppState, row: number, col: number) {
    const positions = []

    for (const [dx, dy] of directions) {
        const newRow = row + dx
        const newCol = col + dy

        if (
            newRow >= 0 &&
            newRow < state.fields.length &&
            newCol >= 0 &&
            newCol < state.fields[0].cells.length
        ) {
            positions.push([newRow, newCol])
        }
    }

    return positions
}

function generateHints(state: AppState, row: number, col: number) {
    return generateSurroundPosition(state, row, col).reduce((acc, [newRow, newCol]) => {
        const cell = state.fields[newRow].cells[newCol]
        return acc + (cell.isMine ? 1 : 0)
    }, 0)
}

function flipZeroCell(state: AppState, row: number, col: number) {
    const checkedMaps = {
        [`${row},${col}`]: true
    }
    const checkCells = generateSurroundPosition(state, row, col).filter(([newRow, newCol]) => {
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
        const cell = state.fields[newRow].cells[newCol]

        if (!cell.isMine && !cell.isOpened) {
            const hint = generateHints(state, newRow, newCol)

            cell.isOpened = true
            cell.hint = hint

            if (hint === 0) {
                checkCells.push(
                    ...generateSurroundPosition(state, newRow, newCol).filter(
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
    return state
}

function updateCell(state: AppState, row: number, col: number, fn: (cell: CellState) => CellState) {
    return {
        ...state,
        fields: state.fields.map((field, i) => {
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
}

function taskReducer(state: AppState, action: Action) {
    switch (action.type) {
        case 'init':
            return {
                ...state,
                fields: generateFields(Beginner)
            }

        case 'reset':
            break

        case 'click': {
            const { row, col } = action.payload as { row: number; col: number }
            const cell = state.fields[row].cells[col]

            if (cell.isMine) {
                return end(state)
            }

            if (!cell.isOpened) {
                const hint = generateHints(state, row, col)

                state = updateCell(state, row, col, (cell) => ({
                    ...cell,
                    isOpened: true,
                    hint
                }))

                if (hint === 0) {
                    return {
                        ...state,
                        fields: [
                            ...flipZeroCell(state, row, col).fields.map((field) => ({
                                ...field,
                                cells: field.cells.map((cell) => ({
                                    ...cell
                                }))
                            }))
                        ]
                    }
                }
            }

            break
        }

        case 'mark': {
            const { row, col } = action.payload as { row: number; col: number }
            return updateCell(state, row, col, (cell) => ({
                ...cell,
                isMarked: true
            }))
        }

        default:
            break
    }

    return state
}

export const appState: AppState = {
    state: 'init',
    level: Beginner,
    count: 0,
    remain: 0,
    fields: []
}

export const AppContext = createContext<
    | (AppState & {
          dispatch?: React.Dispatch<Action>
      })
    | null
>(null)

export const AppProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(taskReducer, appState)

    return <AppContext.Provider value={{ ...state, dispatch }}>{children}</AppContext.Provider>
}

export const useAppContext = () => useContext(AppContext)
