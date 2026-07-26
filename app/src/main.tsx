import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

// GitHub Pages 部署在 /ocean-heart/ 子路径下,本地/后端托管在根路径 —— 运行时自动适配 basename
const basename = window.location.pathname.startsWith('/ocean-heart') ? '/ocean-heart' : '/'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
