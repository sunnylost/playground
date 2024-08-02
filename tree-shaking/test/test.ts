import { resolve } from 'node:path'
import { analysisFile } from '../src'

analysisFile(resolve(import.meta.dirname, './b.js'))
