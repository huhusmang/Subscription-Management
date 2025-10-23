"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { useSettingsStore } from "@/store/settingsStore"

function ThemeSync() {
  const ensureSettings = useSettingsStore((state) => state.ensureSettings)

  React.useEffect(() => {
    // Fetch settings on app start to sync with backend
    ensureSettings()
  }, [ensureSettings])

  return null
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      <ThemeSync />
      {children}
    </NextThemesProvider>
  )
}
