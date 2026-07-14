// @ts-expect-error side-effect CSS imports
import '@fontsource-variable/fraunces'
// @ts-expect-error side-effect CSS imports
import '@fontsource-variable/public-sans'
// @ts-expect-error side-effect CSS imports
import '@fontsource-variable/jetbrains-mono'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
