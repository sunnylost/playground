import { useEffect, useMemo, useState } from 'react'
import {
    OBJECT_FOLD_END,
    OBJECT_FOLD_START,
    ARRAY_FOLD_START,
    ARRAY_FOLD_END
} from '../../consts'
import { ViewerNode } from './node.tsx'

function iterate(type: string, data: unknown) {
    if (type === 'object') {
        return Object.entries(data)
    }

    if (type === 'array' || type === 'set') {
        data = [...data]
        return data.map((item, i) => [i, item])
    }

    return [...data]
}

export function CollectionNode(type: string, data: unknown) {
    const [isToggle, setToggle] = useState(false)
    const propNum = Object.keys(data).length
    const ellipsisText = `${propNum} prop${propNum > 1 ? 's' : ''}`
    const [ellipsisClass, setEllipsisClass] = useState('')
    const foldStart = useMemo(() =>
        type === 'array' ? ARRAY_FOLD_START : OBJECT_FOLD_START
    )
    const foldEnd = useMemo(() =>
        type === 'array' ? ARRAY_FOLD_END : OBJECT_FOLD_END
    )

    useEffect(() => {
        setEllipsisClass(
            isToggle ? `${type}-node ml-2 flex` : `${type}-node ml-2`
        )
    }, [isToggle])

    function handleToggle() {
        setToggle(!isToggle)
    }

    return (
        <div className={ellipsisClass}>
            <div className="flex items-center justify-start">
                <div
                    className="mr-2 cursor-pointer"
                    onClick={() => handleToggle()}
                >
                    {isToggle ? '+' : '-'}
                </div>
                <div className="text-neutral-300">{foldStart}</div>
            </div>
            {isToggle ? (
                <div className="cursor-pointer" onClick={() => handleToggle()}>
                    {ellipsisText}
                </div>
            ) : (
                iterate(type, data).map(([key, value]) => {
                    return (
                        <div key={key} className="flex items-start">
                            <div className="node-label">{key}</div>
                            <div className="ml-1 mr-2">:</div>
                            <div className="node-value">
                                <ViewerNode data={value}></ViewerNode>
                            </div>
                        </div>
                    )
                })
            )}
            <div className="text-neutral-300">{foldEnd}</div>
        </div>
    )
}
