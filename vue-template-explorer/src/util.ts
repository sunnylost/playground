export function getDataType(data: unknown): string {
    return Object.prototype.toString.call(data).slice(8, -1).toLowerCase()
}

const primitiveTypes = [
    'null',
    'undefined',
    'string',
    'number',
    'boolean',
    'symbol',
    'bigint'
]

export function isPrimitiveType(type: string) {
    return primitiveTypes.includes(type)
}
