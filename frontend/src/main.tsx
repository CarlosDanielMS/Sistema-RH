import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// StrictMode removido: react-beautiful-dnd não suporta React 18 StrictMode
createRoot(document.getElementById('root')!).render(<App />)
