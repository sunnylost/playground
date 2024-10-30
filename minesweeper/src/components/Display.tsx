import { useEffect, useState } from 'react'

export function Display({ value }: { value: number | string }) {
    const [digits, setDigits] = useState<string[]>(['0', '0', '0'])

    useEffect(() => {
        const stringOfValue = String(value).padStart(3, '0')

        setDigits(stringOfValue.substring(stringOfValue.length - 3).split(''))
    }, [value])

    return (
        <div className="display">
            <div
                style={{
                    '--digit': digits[0]
                }}
            ></div>
            <div
                style={{
                    '--digit': digits[1]
                }}
            ></div>
            <div
                style={{
                    '--digit': digits[2]
                }}
            ></div>
        </div>
    )
}
