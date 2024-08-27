import React from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!, {
    onUncaughtError(error, errorInfo) {
        console.log(error, errorInfo)
    }
}).render(
    <StrictMode>
        <App />
    </StrictMode>
)
