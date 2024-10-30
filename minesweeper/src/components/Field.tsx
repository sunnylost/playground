import { useAppContext } from '../state'
import { Cell } from './Cell'

export function Field() {
    const context = useAppContext()!

    return (
        <div className="field">
            {context?.fields.map((field) => (
                <div key={field.key} className="row">
                    {field.cells.map((cell) => (
                        <Cell key={`${cell.row}-${cell.col}`} {...cell} />
                    ))}
                </div>
            ))}
        </div>
    )
}
