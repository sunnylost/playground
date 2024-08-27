export function UnknownNode(node: unknown) {
    console.log('unknown node', node)
    return <div className="unknown-node">{node}</div>
}
