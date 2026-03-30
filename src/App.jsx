import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider, useToast } from './context/ToastContext'
import { AppConfigProvider } from './context/AppConfigContext'
import { setApiErrorHandler } from './utils/api'

// Public pages
import LoginPage          from './pages/public/LoginPage'
import RegisterPage       from './pages/public/RegisterPage'
import PricingPage        from './pages/public/PricingPage'
import AccessDeniedPage   from './pages/public/AccessDeniedPage'
import SetPasswordPage    from './pages/public/SetPasswordPage'
import ChangePasswordPage from './pages/head/ChangePasswordPage'

// Setup wizard (lazy)
const SetupWizard = lazy(() => import('./pages/setup/SetupWizard'))

// Role-based route fragments
import { HeadRoutes  } from './routes/headRoutes'
import { BURoutes    } from './routes/buRoutes'
import { RecRoutes   } from './routes/recRoutes'
import { StuRoutes   } from './routes/stuRoutes'
import { AdminRoutes } from './routes/adminRoutes'

/** Connects the global API error handler to the toast system. */
function ApiErrorSetup() {
  const toast = useToast()
  useEffect(() => {
    setApiErrorHandler(msg => toast.error(msg))
    return () => setApiErrorHandler(null)
  }, [toast])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppConfigProvider>
        <ApiErrorSetup />
        <Routes>
          {/* Public */}
          <Route path="/login"         element={<LoginPage />} />
          <Route path="/register"      element={<RegisterPage />} />
          <Route path="/pricing"       element={<PricingPage />} />
          <Route path="/access-denied" element={<AccessDeniedPage />} />
          <Route path="/set-password"    element={<SetPasswordPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/"              element={<Navigate to="/login" replace />} />
          <Route path="/setup"         element={<Suspense fallback={null}><SetupWizard /></Suspense>} />

          {/* Role sections — each fragment owns its AppLayout + auth guard */}
          {AdminRoutes}
          {HeadRoutes}
          {BURoutes}
          {RecRoutes}
          {StuRoutes}

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </AppConfigProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
