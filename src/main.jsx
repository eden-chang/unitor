import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Unitor from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Unitor />
  </StrictMode>,
)
