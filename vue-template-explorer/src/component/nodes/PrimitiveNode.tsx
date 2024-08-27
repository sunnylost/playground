import { PrimitiveType } from '../../type'
import { getDataType } from '../../util.ts'
import { QUOTE } from '../../consts.ts'

export function PrimitiveNode(node: PrimitiveType) {
    const type = getDataType(node)

    if (type === 'string') {
        return (
            <div className="string-node flex items-center">
                <div className="text-neutral-300">{QUOTE}</div>
                <div>{node}</div>
                <div className="text-neutral-300">{QUOTE}</div>
            </div>
        )
    }
    return <div className="primitive-node">{node}</div>
}
