const ROW = 30
const COL = 30

type Cell = {
    dom: HTMLElement
    row: number
    col: number
    live: boolean
}
type Grid = Cell[][]

function isOutOfGrid(row: number, col: number) {
    return row < 0 || row >= ROW || col < 0 || col >= COL
}

function getLiveNeighbourNum(grid: Grid, row: number, col: number) {
    const directions = [
        [1, 0],
        [1, 1],
        [0, 1],
        [-1, 1],
        [-1, 0],
        [-1, -1],
        [0, -1],
        [1, -1]
    ]
    let count = 0

    for (const [rowOffset, colOffset] of directions) {
        const newRow = row + rowOffset
        const newCol = col + colOffset

        if (!isOutOfGrid(newRow, newCol) && grid[newRow][newCol].live) {
            count++
        }
    }

    return count
}

/**
 * 1. Any live cell with fewer than two live neighbours dies, as if by underpopulation.
 * 2. Any live cell with two or three live neighbours lives on to the next generation.
 * 3. Any live cell with more than three live neighbours dies, as if by overpopulation.
 * 4. Any dead cell with exactly three live neighbours becomes a live cell, as if by reproduction.
 */
function applyRules(grid: Grid, cell: Cell) {
    const liveNum = getLiveNeighbourNum(grid, cell.row, cell.col)

    if (cell.live) {
        cell.live = liveNum === 2 || liveNum === 3
    } else {
        cell.live = liveNum === 3
    }

    cell.dom.classList[cell.live ? 'add' : 'remove']('on')
}

function initGrid() {
    const root = document.getElementById('root')
    const grid: Grid = Array.from(
        {
            length: ROW
        },
        (_, row) =>
            Array.from(
                {
                    length: COL
                },
                (_, col) => {
                    const cell = document.createElement('div')
                    cell.classList.add('cell')
                    root.appendChild(cell)

                    return {
                        row,
                        col,
                        dom: cell,
                        live: false
                    }
                }
            )
    )

    return grid
}

const SEED_NUM = 100

function randomPosition(limit: number) {
    return Math.floor(Math.random() * limit)
}

function generateRandomSeed(grid: Grid) {
    let seeds = 0
    while (seeds < SEED_NUM) {
        const row = randomPosition(ROW)
        const col = randomPosition(COL)

        if (!grid[row][col].live) {
            grid[row][col].live = true
            grid[row][col].dom.classList.add('on')
            seeds++
        }
    }
}

function cycle(grid: Grid) {
    const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })))

    for (let i = 0; i < ROW; i++) {
        for (let j = 0; j < COL; j++) {
            applyRules(grid, newGrid[i][j])
        }
    }

    for (let i = 0; i < ROW; i++) {
        for (let j = 0; j < COL; j++) {
            grid[i][j].live = newGrid[i][j].live
        }
    }
}

function run(grid: Grid) {
    setTimeout(() => {
        cycle(grid)
        run(grid)
    }, 100)
}

const Grid = initGrid()
generateRandomSeed(Grid)
run(Grid)
