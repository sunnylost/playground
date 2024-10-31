import { Count } from './Count'
import { Smile } from './Smile'
import { Time } from './Time'

export function TopBar() {
    return (
        <div className="topbar">
            <Count />
            <Smile />
            <Time />
        </div>
    )
}
