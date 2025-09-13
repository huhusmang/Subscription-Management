import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import { Download, Upload } from "lucide-react"

import { Subscription } from "@/store/subscriptionStore"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { 
  Select,
  SelectContent, 
  SelectItem,
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
// import removed: Input (no longer used)

import { Label } from "@/components/ui/label"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmation } from "@/hooks/use-confirmation"

import { useSettingsStore, ThemeType } from "@/store/settingsStore"
import { ImportModal } from "@/components/imports/ImportModal"
import { useSubscriptionStore } from "@/store/subscriptionStore"
import {
  exportSubscriptionsToJSON,
  downloadFile,
} from "@/lib/subscription-utils"
// import removed: useToast (no longer used)
import { ExchangeRateManager } from "@/components/ExchangeRateManager"
import { OptionsManager } from "@/components/subscription/OptionsManager"
import { NotificationSettings } from "@/components/notification/NotificationSettings"
import { useTheme } from "next-themes"

export function SettingsPage() {
  const { t } = useTranslation(['settings', 'common'])
  const [searchParams] = useSearchParams()

  // Import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  // Get tab from URL params
  const defaultTab = searchParams.get('tab') || 'general'

  // Theme from next-themes
  const { setTheme: setNextTheme } = useTheme()

  // Settings store values
  const {
    theme,
    setTheme,



    resetSettings,
    isLoading,
    fetchSettings
  } = useSettingsStore()

  // Removed API Key state

  // Subscription store methods
  const { subscriptions, resetSubscriptions, addSubscription } = useSubscriptionStore()

  const initializeSettings = useCallback(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    initializeSettings()
  }, [initializeSettings])
  
  // Removed API key effects



  // Removed API key handlers

  // Handle data export
  const handleExportData = () => {
    const data = exportSubscriptionsToJSON(subscriptions)
    downloadFile(data, "subscriptions.json", "application/json")
  }

  // Handle imports
  const handleImportData = (subscriptionData: unknown[]) => {
    subscriptionData.forEach((sub) => {
      // Type guard to ensure sub has the required properties
      if (sub && typeof sub === 'object' && 'name' in sub) {
        addSubscription(sub as Omit<Subscription, "id" | "lastBillingDate">)
      }
    })
  }

  // Handle data reset with confirmation
  const handleResetData = async () => {
    await resetSubscriptions()
    await resetSettings()
    window.location.reload()
  }
  
  const resetConfirmation = useConfirmation({
    title: t('resetAllData'),
    description: t('resetAllDataConfirm'),
    confirmText: t('resetAllData'),
    onConfirm: handleResetData,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-16rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium">{t('loadingSettings')}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
      </div>

      <Tabs defaultValue={defaultTab}>
        <div className="overflow-x-auto mb-4 sm:overflow-visible">
          <TabsList className="mb-4 min-w-max sm:min-w-0">
            <TabsTrigger value="general" className="text-xs sm:text-sm px-2 sm:px-3">{t('general')}</TabsTrigger>
            <TabsTrigger value="currency" className="text-xs sm:text-sm px-2 sm:px-3">{t('currency')}</TabsTrigger>
            <TabsTrigger value="options" className="text-xs sm:text-sm px-2 sm:px-3">{t('options')}</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm px-2 sm:px-3">{t('notifications')}</TabsTrigger>
            <TabsTrigger value="data" className="text-xs sm:text-sm px-2 sm:px-3">{t('data')}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('generalSettings')}</CardTitle>
              <CardDescription>{t('customizeGeneralPreferences')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="theme">{t('themeMode')}</Label>
                <Select
                  value={theme}
                  onValueChange={async (value: ThemeType) => {
                    // Update both stores to keep them in sync
                    await setTheme(value)
                    setNextTheme(value)
                  }}
                >
                  <SelectTrigger id="theme">
                    <SelectValue placeholder={t('selectTheme')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{t('light')}</SelectItem>
                    <SelectItem value="dark">{t('dark')}</SelectItem>
                    <SelectItem value="system">{t('system')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('chooseBetweenThemes')}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currency" className="space-y-4">
          <ExchangeRateManager />
        </TabsContent>

        <TabsContent value="options" className="space-y-4">
          <OptionsManager />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationSettings userId={1} />
        </TabsContent>
   
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('dataManagement')}</CardTitle>
              <CardDescription>
                {t('exportImportDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* API key UI removed since auth is session-based */}
            </CardContent>
            <CardFooter className="hidden" />
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{t('dataManagement')}</CardTitle>
              <CardDescription>
                {t('exportImportDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button variant="outline" onClick={handleExportData}>
                <Download className="mr-2 h-4 w-4" />
                {t('exportData')}
              </Button>
              <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                {t('importData')}
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-4 border-destructive">
            <CardHeader>
              <CardTitle>{t('resetData')}</CardTitle>
              <CardDescription>
                {t('resetDataDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={resetConfirmation.openDialog}>
                {t('resetAllData')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
      
      <ImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImport={handleImportData}
      />
      
      {/* Reset Confirmation Dialog */}
      <ConfirmDialog {...resetConfirmation.dialogProps} />
    </>
  )
}
