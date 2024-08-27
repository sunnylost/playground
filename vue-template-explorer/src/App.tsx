import { Editor, Output, Splitter } from './component'
import { useState } from 'react'

function App() {
    const [rootNode, setRootNode] = useState(null)

    function handleEditorChange(node) {
        setRootNode(node)
    }

    return (
        <div className="w-full h-full">
            <Splitter>
                <Editor onChange={handleEditorChange}></Editor>
                <Output data={rootNode}></Output>
            </Splitter>
        </div>
    )
}

export default App
