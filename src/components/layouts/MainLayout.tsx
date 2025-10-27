import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  Settings,
  BarChart3,
  CreditCard,
  History,
  LogOut,
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

  const navLinks = [
    {
      to: '/',
      icon: <Home className="h-4 w-4" />,
      text: t('dashboard'),
    },
    {
      to: '/subscriptions',
      icon: <CreditCard className="h-4 w-4" />,
      text: t('subscriptions'),
    },
    {
      to: '/expense-reports',
      icon: <BarChart3 className="h-4 w-4" />,
      text: t('reports'),
    },
    {
      to: '/notifications',
      icon: <History className="h-4 w-4" />,
      text: t('notifications'),
    },
    {
      to: '/settings',
      icon: <Settings className="h-4 w-4" />,
      text: t('settings'),
    },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between py-4 px-4 sm:px-6">
          <div className="flex items-center gap-6 md:gap-10">
            <Link to="/" className="flex items-center space-x-2">
              <span className="font-bold text-lg sm:text-xl">SubManager</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1 sm:gap-2">
              {navLinks.map((link) => (
                <Link to={link.to} key={link.to}>
                  <Button
                    variant={
                      location.pathname === link.to ? 'default' : 'ghost'
                    }
                    size="sm"
                    className="px-2 sm:px-3"
                  >
                    {link.icon}
                    <span className="md:ml-2">{link.text}</span>
                  </Button>
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ModeToggle />
            {user && (
              <>
                <UIButton
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="hidden md:inline-flex"
                >
                  {t('logout')}
                </UIButton>
                <UIButton
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="md:hidden"
                >
                  <LogOut className="h-5 w-5" />
                </UIButton>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container py-4 sm:py-6 px-4 sm:px-6 flex-grow pb-20 md:pb-6">
        {children}
      </main>

      <footer className="border-t py-4 sm:py-6 hidden md:block">
        <div className="container flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6 px-4 sm:px-6">
          <p className="text-center text-sm leading-loose text-muted-foreground">
            &copy; {new Date().getFullYear()} SubManager. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Bottom Navigation for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background">
        <div className="container mx-auto px-4">
          <nav className="flex justify-around items-center h-16">
            {navLinks.map((link) => (
              <Link
                to={link.to}
                key={link.to}
                className="flex flex-col items-center justify-center text-muted-foreground hover:text-primary"
              >
                <Button
                  variant={
                    location.pathname === link.to ? 'secondary' : 'ghost'
                  }
                  size="icon"
                >
                  {link.icon}
                </Button>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}
