import {
  Calendar,
  CreditCard,
  ExternalLink,
  Tag,
  RotateCcw,
  Hand,
  DollarSign,
  User,
  FileText,
  Globe
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { Subscription, useSubscriptionStore } from "@/store/subscriptionStore"
import {
  formatDate,
  daysUntil,
  getBillingCycleLabel,
  getCategoryLabel,
  getPaymentMethodLabel
} from "@/lib/subscription-utils"
import { formatWithUserCurrency } from "@/utils/currency"
import { useIsMobile } from "@/hooks/use-mobile"
import { useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import { PaymentHistorySection } from "./PaymentHistorySection"

// Use the correct types from the store
interface CategoryOption {
  id: number
  value: string
  label: string
}

interface PaymentMethodOption {
  id: number
  value: string
  label: string
}

interface SubscriptionDetailDialogProps {
  subscription: Subscription | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (id: number) => void
  onManualRenew?: (id: number) => void
}

interface ContentComponentProps {
  subscription: Subscription
  categories: CategoryOption[]
  paymentMethods: PaymentMethodOption[]
  onEdit?: (id: number) => void
  onManualRenew?: (id: number) => void
  onOpenChange: (open: boolean) => void
}

const ContentComponent = ({
  subscription,
  categories,
  paymentMethods,
  onEdit,
  onManualRenew,
  onOpenChange
}: ContentComponentProps) => {
  const { t } = useTranslation(['subscription', 'common'])
  const {
    id,
    name,
    plan,
    amount,
    currency,
    nextBillingDate,
    lastBillingDate,
    billingCycle,
    status,
    renewalType,
    startDate,
    notes,
    website
  } = subscription

  const categoryLabel = getCategoryLabel(subscription, categories)
  const paymentMethodLabel = getPaymentMethodLabel(subscription, paymentMethods)
  const daysLeft = daysUntil(nextBillingDate)
  const isExpiringSoon = daysLeft <= 7

  const getBadgeVariant = () => {
    if (status === 'cancelled') return "secondary"
    if (daysLeft <= 3) return "destructive"
    if (daysLeft <= 7) return "default"
    return "secondary"
  }

  const getBillingCycleBadgeVariant = () => {
    switch (billingCycle) {
      case 'monthly':
        return "default"
      case 'yearly':
        return "secondary"
      case 'quarterly':
        return "outline"
      case 'semiannual':
        return "default"
      default:
        return "secondary"
    }
  }

  const [activeTab, setActiveTab] = useState("details")

  return (
    <div className="w-full">
      <div className="grid w-full grid-cols-2 mb-4 h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
        <button
          onClick={() => setActiveTab("details")}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
            activeTab === "details"
              ? "bg-background text-foreground shadow"
              : ""
          }`}
        >
          {t('common:details')}
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
            activeTab === "payments"
              ? "bg-background text-foreground shadow"
              : ""
          }`}
        >
          {t('subscription:paymentHistory')}
        </button>
      </div>

      <div className={`space-y-4 mt-0 ${activeTab !== "details" ? "hidden" : ""}`}>

      {/* Basic Information */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{t('subscription:details.subscriptionPlan')}</span>
        </div>
        <div className="pl-6">
          <p className="text-sm break-words">{plan}</p>
        </div>
      </div>

      <Separator />

      {/* Pricing Information */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{t('subscription:details.pricing')}</span>
        </div>
        <div className="pl-6 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm">{t('subscription:details.amount')}</span>
            <span className="font-semibold text-sm break-words text-right">
              {formatWithUserCurrency(amount, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm">{t('subscription:details.billingCycle')}</span>
            <Badge variant={getBillingCycleBadgeVariant()} className="text-xs h-5 shrink-0">
              {getBillingCycleLabel(billingCycle)}
            </Badge>
          </div>
        </div>
      </div>

      <Separator />

      {/* Payment Information */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{t('subscription:details.paymentDetails')}</span>
        </div>
        <div className="pl-6 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm">{t('subscription:details.paymentMethod')}</span>
            <span className="text-sm break-words text-right">{paymentMethodLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm">{t('subscription:details.renewalType')}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              {renewalType === 'auto' ? (
                <RotateCcw className="h-3 w-3" />
              ) : (
                <Hand className="h-3 w-3" />
              )}
              <span className="text-sm">{renewalType === 'auto' ? t('subscription:details.automatic') : t('subscription:details.manual')}</span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Date Information */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{t('subscription:details.importantDates')}</span>
        </div>
        <div className="pl-6 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm">{t('subscription:details.startDate')}</span>
            <span className="text-sm">{formatDate(startDate)}</span>
          </div>
          {lastBillingDate && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">{t('subscription:details.lastPayment')}</span>
              <span className="text-sm">{formatDate(lastBillingDate)}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm">{t('subscription:details.nextPayment')}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-sm ${isExpiringSoon ? "text-destructive font-medium" : ""}`}>
                {formatDate(nextBillingDate)}
              </span>
              {isExpiringSoon && status === 'active' && (
                <Badge variant={getBadgeVariant()} className="text-xs h-5 shrink-0">
                  {daysLeft === 0 ? t('common:today') : `${daysLeft} ${t('common:days')}`}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Category */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{t('common:category')}</span>
        </div>
        <div className="pl-6">
          <Badge variant="outline" className="text-xs h-5">{categoryLabel}</Badge>
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{t('common:notes')}</span>
            </div>
            <div className="pl-6">
              <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {notes}
              </p>
            </div>
          </div>
        </>
      )}

      {/* Website */}
      {website && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{t('common:website')}</span>
            </div>
            <div className="pl-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(website, '_blank')}
                className="gap-2 text-sm h-9 w-full sm:w-auto"
              >
                <ExternalLink className="h-4 w-4" />
                {t('subscription:details.visitWebsite')}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Action Buttons */}
      <Separator />
      <div className="flex flex-col gap-3 pt-2">
        {onEdit && (
          <Button
            onClick={() => {
              onEdit(id)
              onOpenChange(false)
            }}
            className="w-full h-10 text-sm"
            size="default"
          >
            {t('subscription:details.editSubscription')}
          </Button>
        )}
        {renewalType === 'manual' && status === 'active' && onManualRenew && (
          <Button
            variant="outline"
            onClick={() => {
              onManualRenew(id)
              onOpenChange(false)
            }}
            className="w-full gap-2 h-10 text-sm"
            size="default"
          >
            <RotateCcw className="h-4 w-4" />
            {t('subscription:details.renewNow')}
          </Button>
        )}
      </div>
      </div>

      <div className={`mt-0 ${activeTab !== "payments" ? "hidden" : ""}`}>
        <PaymentHistorySection
          subscriptionId={id}
          subscriptionName={name}
        />
      </div>
    </div>
  )
}

export function SubscriptionDetailDialog({
  subscription,
  open,
  onOpenChange,
  onEdit,
  onManualRenew
}: SubscriptionDetailDialogProps) {
  const isMobile = useIsMobile()
  const { categories, paymentMethods } = useSubscriptionStore()

  if (!subscription) return null

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="!w-full !max-w-none h-full flex flex-col p-0">
          <SheetHeader className="text-left pb-3 px-4 pt-6 shrink-0">
            <SheetTitle className="flex flex-col gap-1.5">
              <span className="text-lg font-semibold break-words">{subscription.name}</span>
              <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'} className="self-start text-xs">
                {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
              </Badge>
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            <ContentComponent
              subscription={subscription}
              categories={categories}
              paymentMethods={paymentMethods}
              onEdit={onEdit}
              onManualRenew={onManualRenew}
              onOpenChange={onOpenChange}
            />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[85vh] overflow-y-auto p-4">
        <DialogHeader className="pb-3">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-base sm:text-lg">{subscription.name}</span>
            <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'} className="self-start sm:self-auto text-xs">
              {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <ContentComponent
          subscription={subscription}
          categories={categories}
          paymentMethods={paymentMethods}
          onEdit={onEdit}
          onManualRenew={onManualRenew}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  )
}
