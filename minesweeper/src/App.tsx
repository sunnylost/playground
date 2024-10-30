import { useEffect } from 'react'
import { Field, TopBar } from './components'
import { useAppContext } from './state'

function App() {
    const context = useAppContext()

    useEffect(() => {
        context?.dispatch?.({
            type: 'init'
        })
    }, [])

    return (
        <div className="main">
            <TopBar />
            <Field />
        </div>
    )
}

export default App
