import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './style.css'
import './story/World' // Register all story content (locations, NPCs, cards, scripts)

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

