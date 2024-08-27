import { useMemo, useRef, useState } from 'react'

const defaultWidth = 50

export function Splitter({ children }) {
    const containerRef = useRef(null)
    const [width, setWidth] = useState(defaultWidth)
    const separatorStyle = useMemo(
        () => ({
            left: `${width}%`
        }),
        [width]
    )
    const leftPanelStyle = useMemo(
        () => ({
            width: `${width}%`
        }),
        [width]
    )
    const rightPanelStyle = useMemo(
        () => ({
            width: `${100 - width}%`
        }),
        [width]
    )

    function handleMousedown() {
        document.body.addEventListener('mousemove', handleMousemove)
        document.body.addEventListener('mouseup', handleMouseup)
    }

    function handleMouseup() {
        document.body.removeEventListener('mousemove', handleMousemove)
        document.body.removeEventListener('mouseup', handleMouseup)
    }

    function handleMousemove(e: MouseEvent) {
        if (!containerRef.current) {
            return
        }

        setWidth(
            Math.min(100, (100 * e.clientX) / containerRef.current.offsetWidth)
        )
    }

    return (
        <div ref={containerRef} className="w-full h-full flex">
            <div style={leftPanelStyle}>{children[0]}</div>
            <div
                className="absolute w-4 h-full bg-slate-400 hover:bg-slate-600 cursor-col-resize"
                style={separatorStyle}
                onMouseDown={() => handleMousedown()}
            ></div>
            <div style={rightPanelStyle}>{children[1]}</div>
        </div>
    )
}
