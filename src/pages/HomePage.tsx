import { useState, useEffect, useCallback } from "react"
import {
  Calendar,
  Clock,
  RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "react-i18next"

// Helper function to safely extract error message
const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return String(error)
}


import {
  useSubscriptionStore,
  Subscription
} from "@/store/subscriptionStore"
import { useSettingsStore } from "@/store/settingsStore"
import { formatCurrencyAmount } from "@/utils/currency"
import { getCurrentMonthSpending, getCurrentYearSpending } from "@/lib/expense-analytics-api"

import { SubscriptionForm } from "@/components/subscription/SubscriptionForm"
import { StatCard } from "@/components/dashboard/StatCard"
import { UpcomingRenewals } from "@/components/dashboard/UpcomingRenewals"
import { RecentlyPaid } from "@/components/dashboard/RecentlyPaid"
import { CategoryBreakdown } from "@/components/dashboard/CategoryBreakdown"
import { ImportModal } from "@/components/imports/ImportModal"

function HomePage() {
  const { toast } = useToast()
  const { t } = useTranslation(['dashboard', 'common'])
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  // Get the default view from settings
  const userCurrency = useSettingsStore((state) => state.currency)
  const ensureSettings = useSettingsStore((state) => state.ensureSettings)
  
  const {
    subscriptions,
    bulkAddSubscriptions,
    updateSubscription,
    fetchSubscriptions,
    getUpcomingRenewals,
    getRecentlyPaid,
    getSpendingByCategory,
    ensureInitialized,
    initializeWithRenewals,
    isLoading
  } = useSubscriptionStore()

  // State for API-based spending data
  const [monthlySpending, setMonthlySpending] = useState<number>(0)
  const [yearlySpending, setYearlySpending] = useState<number>(0)
  const [isLoadingSpending, setIsLoadingSpending] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Initialize subscriptions without auto-renewals
  const initialize = useCallback(async () => {
    await Promise.all([
      ensureSettings(),
      ensureInitialized()
    ])
  }, [ensureInitialized, ensureSettings])

  useEffect(() => {
    initialize()
  }, [initialize])

  // Load spending data from API
  useEffect(() => {
    const loadSpendingData = async () => {
      setIsLoadingSpending(true)

      try {
        const [currentMonth, currentYear] = await Promise.all([
          getCurrentMonthSpending(userCurrency),
          getCurrentYearSpending(userCurrency)
        ])

        setMonthlySpending(currentMonth)
        setYearlySpending(currentYear)
      } catch (error) {
        console.error('Failed to load spending data:', error)
      } finally {
        setIsLoadingSpending(false)
      }
    }

    if (userCurrency) {
      loadSpendingData()
    }
  }, [userCurrency])

  // Handler for updating subscription
  const handleUpdateSubscription = async (id: number, data: Omit<Subscription, "id" | "lastBillingDate">) => {
    const { error } = await updateSubscription(id, data)

    if (error) {
      toast({
        title: t('subscription:errorUpdate') || "Error updating subscription",
        description: getErrorMessage(error) || "Failed to update subscription",
        variant: "destructive"
      })
      return
    }

    setEditingSubscription(null)
    toast({
      title: t('subscription.updated') || "Subscription updated",
      description: `${data.name} ${t('subscription.updateSuccess') || "has been updated successfully."}`
    })
  }

  // Handler for manual refresh with renewals
  const handleRefreshWithRenewals = async () => {
    setIsRefreshing(true)
    try {
      await initializeWithRenewals()

      // Also refresh spending data
      if (userCurrency) {
        const [currentMonth, currentYear] = await Promise.all([
          getCurrentMonthSpending(userCurrency),
          getCurrentYearSpending(userCurrency)
        ])
        setMonthlySpending(currentMonth)
        setYearlySpending(currentYear)
      }

      toast({
        title: t('dataRefreshed') || "Data refreshed",
        description: t('dataRefreshedDesc') || "Subscription data and renewals have been processed."
      })
    } catch (error) {
      console.error('Error refreshing data:', error)
      toast({
        title: t('common:refreshFailed') || "Refresh failed",
        description: t('common:refreshFailedDesc') || "Failed to refresh data. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsRefreshing(false)
    }
  }



  // Handler for importing subscriptions
  const handleImportSubscriptions = async (newSubscriptions: Omit<Subscription, "id">[]) => {
    const { error } = await bulkAddSubscriptions(newSubscriptions);

    if (error) {
      toast({
        title: t('subscription:importFailed') || "Import failed",
        description: getErrorMessage(error) ||  "Failed to import subscriptions",
        variant: "destructive",
      });
    } else {
      toast({
        title: t('subscription:importSuccess') || "Import successful",
        description: `${newSubscriptions.length} ${t('common:subscriptions')} ${t('common:importSuccess') || "have been imported."}`,
      });
    }

    // Final fetch to ensure UI is up-to-date
    fetchSubscriptions();
  };



  // Get data for dashboard (non-API data)
  const upcomingRenewals = getUpcomingRenewals(7)
  const recentlyPaidSubscriptions = getRecentlyPaid(7)
  const spendingByCategory = getSpendingByCategory()

  if (isLoading || isLoadingSpending) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-16rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium">{t('common:loading')} {t('common:subscriptions')}...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('common:dashboard')}</h1>
          <p className="text-muted-foreground">
            {t('common:dashboardDescription')}
          </p>
        </div>
        <Button
          onClick={handleRefreshWithRenewals}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? t('common:refreshing') : t('common:refresh')}
        </Button>
      </div>

      {/* Dashboard Content */}
      <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title={t('common:monthlySpending')}
              value={formatCurrencyAmount(monthlySpending, userCurrency)}
              description={t('common:currentMonthExpenses')}
              icon={Calendar}
              iconColor="text-blue-500"
            />
            <StatCard
              title={t('common:yearlySpending')}
              value={formatCurrencyAmount(yearlySpending, userCurrency)}
              description={t('common:currentYearTotal')}
              icon={Calendar}
              iconColor="text-purple-500"
            />
            <StatCard
              title={t('common:activeSubscriptions')}
              value={subscriptions.filter(sub => sub.status === "active").length}
              description={t('common:totalServices')}
              icon={Clock}
              iconColor="text-green-500"
            />
          </div>
          
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            <RecentlyPaid
              subscriptions={recentlyPaidSubscriptions}
            />

            <UpcomingRenewals
              subscriptions={upcomingRenewals}
            />

            <CategoryBreakdown data={spendingByCategory} />
          </div>
        </div>



      {/* Forms and Modals */}
      {editingSubscription && (
        <SubscriptionForm
          open={Boolean(editingSubscription)}
          onOpenChange={() => setEditingSubscription(null)}
          initialData={editingSubscription}
          onSubmit={(data) => handleUpdateSubscription(editingSubscription.id, data)}
        />
      )}
      
      <ImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onImport={handleImportSubscriptions}
      />
    </>
  )
}

export default HomePage
