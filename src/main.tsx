import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './style.css'
import './story/Utility'
import './story/Start'
import './story/Effects'
import './story/Lodgings' // Register lodgings scripts
import './story/Lowtown' // Register lowtown location and NPCs
import './story/School' // Register university interior locations

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

