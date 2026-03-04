import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import './styles/fonts.css'
import './styles/tailwind.css'
import './styles/theme.css'
import { RouterProvider } from 'react-router'
import { AuthProvider } from './context/AuthContext'
import { router } from './app/routes'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)