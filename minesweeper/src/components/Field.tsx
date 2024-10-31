import { useAtomValue } from 'jotai'
import { fieldsReducerAtom } from '../states'
import { Cell } from './Cell'

export function Field() {
    const fields = useAtomValue(fieldsReducerAtom)

    return (
        <div className="field">
            {fields.map((field) => (
                <div key={field.key} className="row">
                    {field.cells.map((cell) => (
                        <Cell key={`${cell.row}-${cell.col}`} {...cell} />
                    ))}
                </div>
            ))}
        </div>
    )
}
