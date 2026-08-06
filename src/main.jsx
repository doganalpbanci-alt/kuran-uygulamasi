import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import { applyAppearance } from './lib/appearance.js'

registerSW({ immediate: true })
// İlk render'dan önce uygulanır ki kayıtlı yazı boyutu/fontu bir an için
// varsayılana dönüp geri sıçramasın.
applyAppearance()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
