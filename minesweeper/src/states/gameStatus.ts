import { atom } from 'jotai'
import { BEGIN, CHECKING, FAIL, INIT, SUCCESS } from './const'

export type GameStatus = typeof INIT | typeof BEGIN | typeof CHECKING | typeof SUCCESS | typeof FAIL

export const gameStatusAtom = atom<GameStatus>(INIT)
