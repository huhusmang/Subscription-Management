import { Route, Routes } from "react-router-dom"
import { Suspense, lazy } from "react"
import { Toaster } from "./components/ui/toaster"
import { ThemeProvider } from "./components/ThemeProvider"
import { MainLayout } from "./components/layouts/MainLayout"
import { useTranslation } from "react-i18next"
import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Navigate } from 'react-router-dom'

// Lazy load pages for code splitting
const HomePage = lazy(() => import("./pages/HomePage"))
const SubscriptionsPage = lazy(() => import("./pages/SubscriptionsPage").then(module => ({ default: module.SubscriptionsPage })))
const SettingsPage = lazy(() => import("./pages/SettingsPage").then(module => ({ default: module.SettingsPage })))
const ExpenseReportsPage = lazy(() => import("./pages/ExpenseReportsPage").then(module => ({ default: module.ExpenseReportsPage })))
const NotificationHistoryPage = lazy(() => import("./pages/NotificationHistoryPage").then(module => ({ default: module.NotificationHistoryPage })))
const LoginPage = lazy(() => import("./pages/LoginPage"))


function App() {
  const { t } = useTranslation()
  const { user, fetchMe, initialized } = useAuthStore()
  useEffect(() => { fetchMe() }, [fetchMe])

  const RequireAuth = ({ children }: { children: JSX.Element }) => {
    if (!initialized) {
      return <div className="flex items-center justify-center h-64">{t('loading')}</div>
    }
    if (!user) return <Navigate to="/login" replace />
    return children
  }
  
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <MainLayout>
        <Suspense fallback={<div className="flex items-center justify-center h-64">{t('loading')}</div>}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
            <Route path="/subscriptions" element={<RequireAuth><SubscriptionsPage /></RequireAuth>} />
            <Route path="/expense-reports" element={<RequireAuth><ExpenseReportsPage /></RequireAuth>} />
            <Route path="/notifications" element={<RequireAuth><NotificationHistoryPage /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
          </Routes>
        </Suspense>
      </MainLayout>
      <Toaster />
    </ThemeProvider>
  )
}

export default App
