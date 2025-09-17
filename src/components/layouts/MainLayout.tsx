import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  Settings,
  BarChart3,
  CreditCard,
  History,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/ModeToggle'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { Button as UIButton } from '@/components/ui/button'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation()
  const { t } = useTranslation('navigation')
  const { user, logout } = useAuthStore()

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between py-4 px-4 sm:px-6">
          <div className="flex items-center gap-6 md:gap-10">
            <Link to="/" className="flex items-center space-x-2">
              <span className="font-bold text-lg sm:text-xl">SubManager</span>
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link to="/">
              <Button variant={location.pathname === '/' ? "default" : "ghost"} size="sm" className="px-2 sm:px-3">
                <Home className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('dashboard')}</span>
              </Button>
            </Link>

            <Link to="/subscriptions">
              <Button variant={location.pathname === '/subscriptions' ? "default" : "ghost"} size="sm" className="px-2 sm:px-3">
                <CreditCard className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('subscriptions')}</span>
              </Button>
            </Link>

            <Link to="/expense-reports">
              <Button variant={location.pathname === '/expense-reports' ? "default" : "ghost"} size="sm" className="px-2 sm:px-3">
                <BarChart3 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('reports')}</span>
              </Button>
            </Link>

            <Link to="/notifications">
              <Button variant={location.pathname === '/notifications' ? "default" : "ghost"} size="sm" className="px-2 sm:px-3">
                <History className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('notifications')}</span>
              </Button>
            </Link>

            <Link to="/settings">
              <Button variant={location.pathname === '/settings' ? "default" : "ghost"} size="sm" className="px-2 sm:px-3">
                <Settings className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('settings')}</span>
              </Button>
            </Link>

            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ModeToggle />
              {user && (
                <UIButton variant="ghost" size="sm" onClick={logout}>Logout</UIButton>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <main className="container py-4 sm:py-6 px-4 sm:px-6 flex-grow">{children}</main>
      
      <footer className="border-t py-4 sm:py-6">
        <div className="container flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6 px-4 sm:px-6">
          <p className="text-center text-sm leading-loose text-muted-foreground">
            &copy; {new Date().getFullYear()} SubManager. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
