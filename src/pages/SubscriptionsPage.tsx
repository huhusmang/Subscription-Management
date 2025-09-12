import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { 
  Calendar, 
  Plus, 
  Search, 
  Tags,
  Check,
  Download,
  Upload,
  Calendar as CalendarIcon,
  ArrowUp,
  ArrowDown
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { useToast } from "@/hooks/use-toast"

// Helper function to safely extract error message
const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return String(error)
}
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmation } from "@/hooks/use-confirmation"

import { 
  useSubscriptionStore, 
  Subscription, 
  SubscriptionStatus,
  BillingCycle
} from "@/store/subscriptionStore"
import { optimisticUpdateSubscription, useOptimisticSubscriptions } from "@/store/optimisticStore"
import { useSettingsStore } from "@/store/settingsStore"
import { exportSubscriptionsToJSON } from "@/lib/subscription-utils"

import { SubscriptionCard } from "@/components/subscription/SubscriptionCard"
import { SubscriptionForm } from "@/components/subscription/SubscriptionForm"
import { SubscriptionDetailDialog } from "@/components/subscription/SubscriptionDetailDialog"
import { ImportModal } from "@/components/imports/ImportModal"

export function SubscriptionsPage() {
  const { toast } = useToast()
  const { t } = useTranslation(['common', 'subscription'])
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const [currentView, setCurrentView] = useState<"all" | "active" | "trial" | "cancelled">("all")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedBillingCycles, setSelectedBillingCycles] = useState<BillingCycle[]>([])
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false)
  const [billingCycleFilterOpen, setBillingCycleFilterOpen] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [detailSubscription, setDetailSubscription] = useState<Subscription | null>(null)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  const { fetchSettings } = useSettingsStore()
  
  const {
    subscriptions,
    categories,
    addSubscription,
    bulkAddSubscriptions,
    updateSubscription,
    deleteSubscription,
    fetchSubscriptions,
    getUniqueCategories,
    initializeData,

    manualRenewSubscription,
    isLoading
  } = useSubscriptionStore()

  // Initialize subscriptions without auto-renewals
  const initialize = useCallback(async () => {
    await fetchSettings()
    await initializeData()
  }, [fetchSettings, initializeData])

  useEffect(() => {
    initialize()
  }, [initialize])
  
  // Get categories actually in use
  const usedCategories = getUniqueCategories()
  
  // Get unique billing cycles in use
  const getUniqueBillingCycles = () => {
    const billingCycles = subscriptions.map(sub => sub.billingCycle)
    return Array.from(new Set(billingCycles)).map(cycle => ({
      value: cycle,
      label: cycle.charAt(0).toUpperCase() + cycle.slice(1)
    }))
  }
  
  const usedBillingCycles = getUniqueBillingCycles()

  // Filter subscriptions based on search term, current view, selected categories and billing cycles
  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        sub.plan.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = 
      currentView === "all" || 
      (currentView === "active" && sub.status === "active") ||
      (currentView === "trial" && sub.status === "trial") ||
      (currentView === "cancelled" && sub.status === "cancelled")
    
    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.some(categoryValue => {
        const category = categories.find(cat => cat.value === categoryValue)
        return category && sub.categoryId === category.id
      })
      
    const matchesBillingCycle =
      selectedBillingCycles.length === 0 ||
      selectedBillingCycles.includes(sub.billingCycle)
    
    return matchesSearch && matchesStatus && matchesCategory && matchesBillingCycle
  })

  // 将乐观更新应用到筛选后的订阅列表
  const optimisticFiltered = useOptimisticSubscriptions(filteredSubscriptions)

  const sortedSubscriptions = [...optimisticFiltered].sort((a, b) => {
    const dateA = new Date(a.nextBillingDate).getTime()
    const dateB = new Date(b.nextBillingDate).getTime()

    if (sortOrder === "asc") {
      return dateA - dateB
    } else {
      return dateB - dateA
    }
  })

  // Handler for adding new subscription
  const handleAddSubscription = async (subscription: Omit<Subscription, "id" | "lastBillingDate">) => {
    const { error } = await addSubscription(subscription)
    
    if (error) {
      toast({
        title: t('subscription:errorAdd'),
        description: getErrorMessage(error) || t('subscription:failedAdd'),
        variant: "destructive"
      })
      return
    }
    
    toast({
      title: t('subscription:added'),
      description: `${subscription.name} ${t('subscription:addedSuccess')}`
    })
  }

  // Handler for updating subscription
  const handleUpdateSubscription = async (id: number, data: Omit<Subscription, "id" | "lastBillingDate">) => {
    // 乐观更新：立即更新 UI，然后后台请求与最终刷新
    await optimisticUpdateSubscription(
      id,
      data,
      async () => {
        setEditingSubscription(null)
        toast({
          title: t('subscription:updated'),
          description: `${data.name} ${t('subscription:updateSuccess')}`
        })
        // 背景刷新，确保与后端一致
        fetchSubscriptions()
      },
      (error) => {
        toast({
          title: t('subscription:errorUpdate'),
          description: getErrorMessage(error) || t('subscription:failedUpdate'),
          variant: "destructive"
        })
      }
    )
  }

  // State for delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null)
  
  // Handler for deleting subscription
  const handleDeleteSubscription = async () => {
    if (!deleteTarget) return
    
    const { error } = await deleteSubscription(deleteTarget.id)
    
    if (error) {
      toast({
        title: t('subscription:errorDelete'),
        description: getErrorMessage(error) || t('subscription:failedDelete'),
        variant: "destructive"
      })
      return
    }

    toast({
      title: t('subscription:deleted'),
      description: `${deleteTarget.name} ${t('subscription:deleteSuccess')}`,
      variant: "destructive"
    })
    
    setDeleteTarget(null)
  }
  
  // Confirmation dialog hook
  const deleteConfirmation = useConfirmation({
    title: t('subscription:delete'),
    description: deleteTarget ? `${t('subscription:confirmDelete')} "${deleteTarget.name}"? ${t('subscription:cannotUndo')}` : "",
    confirmText: t('common:delete'),
    onConfirm: handleDeleteSubscription,
  })
  
  // Handler to open delete confirmation
  const handleDeleteClick = (id: number) => {
    const subscription = subscriptions.find(sub => sub.id === id)
    if (!subscription) return
    
    setDeleteTarget({ id, name: subscription.name })
    deleteConfirmation.openDialog()
  }

  // Handler for changing subscription status
  const handleStatusChange = async (id: number, status: SubscriptionStatus) => {
    const subscription = subscriptions.find(sub => sub.id === id)
    if (!subscription) return

    const { error } = await updateSubscription(id, { status })

    if (error) {
      toast({
        title: t('subscription:statusUpdateError'),
        description: getErrorMessage(error) || t('subscription:failedStatusUpdate'),
        variant: "destructive"
      })
      return
    }

  
    toast({
      title: t('subscription:statusUpdated'),
      description: `${subscription.name} ${t('subscription:statusUpdateSuccess')}`
    })
  }

  // Handler for manual renewal
  const handleManualRenew = async (id: number) => {
    const subscription = subscriptions.find(sub => sub.id === id)
    if (!subscription) return

    const { error, renewalData } = await manualRenewSubscription(id)

    if (error) {
      toast({
        title: t('subscription:renewalError'),
        description: getErrorMessage(error),
        variant: "destructive"
      })
      return
    }

    const newBillingDate = renewalData && typeof renewalData === 'object' && 'newNextBilling' in renewalData
      ? String(renewalData.newNextBilling)
      : 'Unknown'

    toast({
      title: t('subscription:renewed'),
      description: t(`${subscription.name} has been renewed. 
        Next billing date: ${newBillingDate}`)
    })
  }

  // Handler for toggling a category in the filter
  const toggleCategoryFilter = (categoryValue: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryValue)) {
        return prev.filter(c => c !== categoryValue)
      } else {
        return [...prev, categoryValue]
      }
    })
  }
  
  // Handler for toggling a billing cycle in the filter
  const toggleBillingCycleFilter = (billingCycle: BillingCycle) => {
    setSelectedBillingCycles(prev => {
      if (prev.includes(billingCycle)) {
        return prev.filter(c => c !== billingCycle)
      } else {
        return [...prev, billingCycle]
      }
    })
  }

  // Handler for importing subscriptions
  const handleImportSubscriptions = async (newSubscriptions: Omit<Subscription, "id">[]) => {
    const { error } = await bulkAddSubscriptions(newSubscriptions);

    if (error) {
      toast({
        title: t('subscription:importFailed'),
        description: getErrorMessage(error) || t('subscription:failedImport'),
        variant: "destructive",
      });
    } else {
      toast({
        title: t('subscription:importSuccess'),
        description: t('subscription:subscriptionsImported', { count: newSubscriptions.length }),
      });
      
      // Close the modal after successful import
      setShowImportModal(false);
    }

    // Final fetch to ensure UI is up-to-date
    fetchSubscriptions();
  };

  // Handler for exporting subscriptions
  const handleExportSubscriptions = () => {
    // Generate JSON data
    const jsonData = exportSubscriptionsToJSON(subscriptions)
    
    // Create a blob and download link
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: t('subscription:exportSuccess'),
      description: t('subscription:exportToJson')
    })
  }
  
  // Get billing cycle badge variant
  const getBillingCycleBadgeVariant = (billingCycle: BillingCycle) => {
    switch (billingCycle) {
      case 'yearly':
        return "success" // Green color for yearly
      case 'monthly':
        return "warning" // Orange/yellow for monthly
      case 'quarterly':
        return "info" // Blue for quarterly
      case 'semiannual':
        return "default"
      default:
        return "outline"
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-16rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium">{t('subscription:loadingSubscriptions')}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('subscription:title')}</h1>
          <p className="text-muted-foreground">
            {t('subscription:manageAllServices')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setShowAddForm(true)} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('subscription:add')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={() => setShowImportModal(true)} size="icon">
                  <Upload className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('common:import')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={handleExportSubscriptions} size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('common:export')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2 w-full max-w-sm">
          <SearchInput
            placeholder={t('subscription:searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
            icon={<Search className="h-4 w-4 text-muted-foreground" />}
          />

          <Popover open={categoryFilterOpen} onOpenChange={setCategoryFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Tags className="h-4 w-4" />
                {selectedCategories.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
                    {selectedCategories.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="end">
              <div className="p-2">
                <div className="font-medium text-sm flex items-center justify-between">
                  <span>{t('subscription:filterByCategory')}</span>
                  {selectedCategories.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setSelectedCategories([])}
                    >
                      {t('common:reset')}
                    </Button>
                  )}
                </div>
              </div>
              <Separator />
              <div className="max-h-72 overflow-y-auto">
                {usedCategories.map((category) => (
                  <div
                    key={category.value}
                    className={cn(
                      "flex items-center px-2 py-1.5 transition-colors hover:bg-muted cursor-pointer",
                      selectedCategories.includes(category.value) && "bg-muted"
                    )}
                    onClick={() => toggleCategoryFilter(category.value)}
                  >
                    <div className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                      selectedCategories.includes(category.value)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "opacity-50 border-primary"
                    )}>
                      {selectedCategories.includes(category.value) && (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                    <div className="text-sm">{category.label}</div>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {subscriptions.filter(s => s.category?.value === category.value).length}
                    </Badge>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Billing Cycle Filter */}
          <Popover open={billingCycleFilterOpen} onOpenChange={setBillingCycleFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <CalendarIcon className="h-4 w-4" />
                {selectedBillingCycles.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
                    {selectedBillingCycles.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="end">
              <div className="p-2">
                <div className="font-medium text-sm flex items-center justify-between">
                  <span>{t('subscription:filterByBillingCycle')}</span>
                  {selectedBillingCycles.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setSelectedBillingCycles([])}
                    >
                      {t('common:reset')}
                    </Button>
                  )}
                </div>
              </div>
              <Separator />
              <div className="max-h-72 overflow-y-auto">
                {usedBillingCycles.map((cycle) => (
                  <div
                    key={cycle.value}
                    className={cn(
                      "flex items-center px-2 py-1.5 transition-colors hover:bg-muted cursor-pointer",
                      selectedBillingCycles.includes(cycle.value as BillingCycle) && "bg-muted"
                    )}
                    onClick={() => toggleBillingCycleFilter(cycle.value as BillingCycle)}
                  >
                    <div className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                      selectedBillingCycles.includes(cycle.value as BillingCycle)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "opacity-50 border-primary"
                    )}>
                      {selectedBillingCycles.includes(cycle.value as BillingCycle) && (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                    <div className="text-sm">{cycle.label}</div>
                    <Badge
                      variant={getBillingCycleBadgeVariant(cycle.value as BillingCycle)}
                      className="ml-auto text-xs"
                    >
                      {subscriptions.filter(s => s.billingCycle === cycle.value).length}
                    </Badge>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                >
                  {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('subscription:sortByNextBilling')} ({sortOrder === 'asc' ? t('common:ascending') : t('common:descending')})</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={currentView === "all" ? "default" : "outline"}
            onClick={() => setCurrentView("all")}
          >
            {t('subscription:all')}
          </Button>
          <Button
            variant={currentView === "active" ? "default" : "outline"}
            onClick={() => setCurrentView("active")}
          >
            {t('subscription:active')}
          </Button>
          <Button
            variant={currentView === "trial" ? "default" : "outline"}
            onClick={() => setCurrentView("trial")}
          >
            {t('subscription:trial')}
          </Button>
          <Button
            variant={currentView === "cancelled" ? "default" : "outline"}
            onClick={() => setCurrentView("cancelled")}
          >
            {t('subscription:cancelled')}
          </Button>
        </div>
      </div>

      {/* Display selected category filters */}
      {(selectedCategories.length > 0 || selectedBillingCycles.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedCategories.map(categoryValue => {
            const category = categories.find(c => c.value === categoryValue)
            return (
              <Badge
                key={categoryValue}
                variant="secondary"
                className="flex items-center gap-1 px-2 py-1"
              >
                {category?.label || categoryValue}
                <button
                  onClick={() => toggleCategoryFilter(categoryValue)}
                  className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                >
                  <span className="sr-only">Remove</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3"
                  >
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                  </svg>
                </button>
              </Badge>
            )
          })}

          {/* Display selected billing cycle filters */}
          {selectedBillingCycles.map(cycleValue => {
            const cycle = usedBillingCycles.find(c => c.value === cycleValue)
            return (
              <Badge
                key={cycleValue}
                variant={getBillingCycleBadgeVariant(cycleValue)}
                className="flex items-center gap-1 px-2 py-1"
              >
                {cycle?.label || cycleValue}
                <button
                  onClick={() => toggleBillingCycleFilter(cycleValue)}
                  className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                >
                  <span className="sr-only">Remove</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3 text-white"
                  >
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                  </svg>
                </button>
              </Badge>
            )
          })}
        </div>
      )}

      {/* Subscriptions Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Loading skeleton cards */}
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-xl border bg-card shadow animate-pulse">
              <div className="p-6 pb-2">
                <div className="flex justify-between items-start mb-2">
                  <div className="space-y-2">
                    <div className="h-5 bg-muted rounded w-24"></div>
                    <div className="h-4 bg-muted rounded w-16"></div>
                  </div>
                  <div className="h-6 bg-muted rounded w-16"></div>
                </div>
              </div>
              <div className="px-6 pb-6 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-6 bg-muted rounded w-20"></div>
                  <div className="h-5 bg-muted rounded w-16"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="h-4 bg-muted rounded w-40"></div>
                  <div className="h-4 bg-muted rounded w-28"></div>
                  <div className="h-4 bg-muted rounded w-36"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : sortedSubscriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium mb-1">{t('subscription:noSubscriptionsFound')}</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || selectedCategories.length > 0 || selectedBillingCycles.length > 0
              ? t('subscription:noResultsForFilters')
              : currentView !== "all"
                ? t('subscription:noSubscriptionsOfType', { type: t(`subscription:${currentView}`) })
                : t('subscription:getStartedMessage')
            }
          </p>
          <div className="flex gap-2">
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('subscription:add')}
            </Button>
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              {t('subscription:importSubscriptions')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedSubscriptions.map((subscription) => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              onEdit={() => setEditingSubscription(subscription)}
              onDelete={() => handleDeleteClick(subscription.id)}
              onStatusChange={handleStatusChange}
              onViewDetails={(subscription) => setDetailSubscription(subscription)}
            />
          ))}
        </div>
      )}

      {/* Forms and Modals */}
      <SubscriptionForm
        open={showAddForm || editingSubscription !== null}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddForm(false)
            setEditingSubscription(null)
          }
        }}
        initialData={editingSubscription || undefined}
        onSubmit={editingSubscription
          ? (data) => handleUpdateSubscription(editingSubscription.id, data)
          : handleAddSubscription
        }
      />

      <SubscriptionDetailDialog
        subscription={detailSubscription}
        open={detailSubscription !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailSubscription(null)
          }
        }}
        onEdit={(id) => {
          const subscription = subscriptions.find(s => s.id === id)
          if (subscription) {
            setEditingSubscription(subscription)
            setDetailSubscription(null)
          }
        }}
        onManualRenew={handleManualRenew}
      />

      <ImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onImport={handleImportSubscriptions}
      />
      <ConfirmDialog {...deleteConfirmation.dialogProps} />
    </>
  )
}
