import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { StationProvider } from './context/StationContext'
import './style.css'

ReactDOM.createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <StationProvider>
      <App />
    </StationProvider>
  </StrictMode>,
)