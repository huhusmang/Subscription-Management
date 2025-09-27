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
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmation } from "@/hooks/use-confirmation"
import { useToast } from "@/hooks/use-toast"

import { useSettingsStore, ThemeType } from "@/store/settingsStore"
import { ImportModal } from "@/components/imports/ImportModal"
import { useSubscriptionStore } from "@/store/subscriptionStore"
import {
  exportSubscriptionsToJSON,
  downloadFile,
} from "@/lib/subscription-utils"
import { ExchangeRateManager } from "@/components/ExchangeRateManager"
import { OptionsManager } from "@/components/subscription/OptionsManager"
import { NotificationSettings } from "@/components/notification/NotificationSettings"
import { useTheme } from "next-themes"
import { useAuthStore } from "@/store/authStore"

export function SettingsPage() {
  const { t } = useTranslation(['settings', 'common'])
  const [searchParams] = useSearchParams()

  const { toast } = useToast()
  const changePassword = useAuthStore((state) => state.changePassword)
  const isAuthLoading = useAuthStore((state) => state.isLoading)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  const defaultTab = searchParams.get('tab') || 'general'

  const { setTheme: setNextTheme } = useTheme()

  const {
    theme,
    setTheme,
    resetSettings,
    isLoading,
    fetchSettings,
  } = useSettingsStore()

  const { subscriptions, resetSubscriptions, addSubscription } = useSubscriptionStore()

  const initializeSettings = useCallback(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    initializeSettings()
  }, [initializeSettings])

  const getPasswordErrorMessage = (code?: string, fallback?: string) => {
    switch (code) {
      case 'CURRENT_PASSWORD_INVALID':
        return t('currentPasswordInvalid')
      case 'PASSWORDS_DO_NOT_MATCH':
        return t('passwordsDoNotMatch')
      case 'PASSWORD_COMPLEXITY_FAILED':
        return t('passwordValidationFailed')
      case 'PASSWORD_SAME_AS_OLD':
        return t('passwordMustDiffer')
      case 'MISSING_FIELDS':
        return t('passwordUpdateFailed')
      default:
        return fallback ?? t('passwordUpdateFailed')
    }
  }

  const validatePasswordForm = () => {
    if (!currentPassword || !newPassword) {
      setPasswordSuccess(null)
      setPasswordError(t('passwordUpdateFailed'))
      return false
    }

    if (newPassword !== confirmPassword) {
      setPasswordSuccess(null)
      setPasswordError(t('passwordsDoNotMatch'))
      return false
    }

    const rule = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/
    if (!rule.test(newPassword)) {
      setPasswordSuccess(null)
      setPasswordError(t('passwordValidationFailed'))
      return false
    }

    if (currentPassword === newPassword) {
      setPasswordSuccess(null)
      setPasswordError(t('passwordMustDiffer'))
      return false
    }

    setPasswordError(null)
    return true
  }

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validatePasswordForm()) {
      return
    }

    setIsSubmittingPassword(true)
    const result = await changePassword(currentPassword, newPassword, confirmPassword)
    setIsSubmittingPassword(false)

    if (result.ok) {
      const successMessage = result.message ?? t('passwordUpdated')
      toast({ description: successMessage })
      setPasswordError(null)
      setPasswordSuccess(successMessage)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } else {
      const errorMessage = getPasswordErrorMessage(result.code, result.error)
      setPasswordSuccess(null)
      setPasswordError(errorMessage)
    }
  }

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
            <TabsTrigger value="security" className="text-xs sm:text-sm px-2 sm:px-3">{t('security')}</TabsTrigger>
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

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('changePassword')}</CardTitle>
              <CardDescription>{t('changePasswordDesc')}</CardDescription>
            </CardHeader>
            <form onSubmit={handleChangePassword}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">{t('currentPassword')}</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">{t('newPassword')}</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <p className="text-xs text-muted-foreground">{t('passwordRules')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{t('confirmNewPassword')}</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
                {passwordError && (
                  <p className="text-sm text-destructive" role="alert">
                    {passwordError}
                  </p>
                )}
                {passwordSuccess && !passwordError && (
                  <p className="text-sm text-emerald-600" role="status">
                    {passwordSuccess}
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button type="submit" disabled={isSubmittingPassword || isAuthLoading}>
                  {isSubmittingPassword || isAuthLoading ? t('signingIn', { ns: 'auth' }) : t('changePassword')}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {t('passwordRules')}
                </p>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
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
