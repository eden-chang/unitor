import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Unitor from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Unitor />
  </StrictMode>,
)
