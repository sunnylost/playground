import { atom } from 'jotai'

export const Beginner = 0
export const Intermediate = 1
export const Expert = 2

export type Level = typeof Beginner | typeof Intermediate | typeof Expert

export const LevelList = [
    {
        name: 'Beginner',
        value: Beginner
    },
    {
        name: 'Intermediate',
        value: Intermediate
    }
] as { name: string; value: Level }[]
export const LevelConfig: [row: number, col: number, mines: number][] = [
    [8, 8, 10],
    [16, 16, 40],
    [16, 30, 99]
] as const

export const gameLevelAtom = atom<Level>(Beginner)
export const gameConfigAtom = atom((get) => LevelConfig[get(gameLevelAtom)])
