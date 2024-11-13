import { useGameFields } from '../states'
import { Cell } from './Cell'

export function Field() {
    // https://github.com/pmndrs/zustand/discussions/1936
    const fields = useGameFields()

    console.log('fields = ', fields)

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
