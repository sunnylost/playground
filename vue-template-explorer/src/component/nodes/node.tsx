import { CollectionNode } from './CollectionNode.tsx'
import { PrimitiveNode } from './PrimitiveNode.tsx'
import { UnknownNode } from './UnknownNode.tsx'
import { getDataType, isPrimitiveType } from '../../util'

function getNodeComponent(type: string) {
    if (isPrimitiveType(type)) {
        return PrimitiveNode
    }

    if (
        type === 'object' ||
        type === 'array' ||
        type === 'set' ||
        type === 'map'
    ) {
        return CollectionNode
    }

    return UnknownNode
}

export function ViewerNode({ data }) {
    try {
        const type = getDataType(data)
        return (
            <div className="ml-4 node w-full h-full overflow-auto">
                {getNodeComponent(type)(type, data)}
            </div>
        )
    } catch (error) {
        console.log(data)
        console.log(error)
    }
}
