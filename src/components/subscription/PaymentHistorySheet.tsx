import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import { Loader2 } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { CurrencySelector } from "@/components/subscription/CurrencySelector"
import { PaymentRecord } from "@/utils/dataTransform"
import { useSettingsStore } from "@/store/settingsStore"

// Form data type for payment record (internal use with Date objects)
interface PaymentFormData {
  subscriptionId: number
  paymentDate: Date
  amountPaid: number | string
  currency: string
  billingPeriodStart: Date
  billingPeriodEnd: Date
  status: string
  notes?: string
}

// API data type for payment record (for submission with string dates)
interface PaymentApiData {
  subscriptionId: number
  paymentDate: string
  amountPaid: number
  currency: string
  billingPeriodStart: string
  billingPeriodEnd: string
  status: string
  notes?: string
}

interface PaymentHistorySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: PaymentRecord
  subscriptionId: number
  subscriptionName: string
  onSubmit: (data: PaymentApiData) => Promise<void>
}

// Form validation types
type FormErrors = {
  [key: string]: string
}

export function PaymentHistorySheet({
  open,
  onOpenChange,
  initialData,
  subscriptionId,
  subscriptionName,
  onSubmit
}: PaymentHistorySheetProps) {
  const { t } = useTranslation(['common', 'validation'])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { currency: userCurrency } = useSettingsStore()

  // State for form data and validation errors
  const [form, setForm] = useState<PaymentFormData>({
    subscriptionId,
    paymentDate: new Date(),
    amountPaid: 0,
    currency: userCurrency,
    billingPeriodStart: new Date(),
    billingPeriodEnd: new Date(),
    status: "succeeded",
    notes: ""
  })

  const [errors, setErrors] = useState<FormErrors>({})

  // Initialize form with initial data when editing
  useEffect(() => {
    if (initialData) {
      setForm({
        subscriptionId: initialData.subscriptionId,
        paymentDate: new Date(initialData.paymentDate),
        amountPaid: initialData.amountPaid,
        currency: initialData.currency,
        billingPeriodStart: new Date(initialData.billingPeriod.start),
        billingPeriodEnd: new Date(initialData.billingPeriod.end),
        status: initialData.status,
        notes: initialData.notes || ""
      })
    } else {
      // Reset form for new payment
      setForm({
        subscriptionId,
        paymentDate: new Date(),
        amountPaid: 0,
        currency: userCurrency,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(),
        status: "succeeded",
        notes: ""
      })
    }
    setErrors({})
  }, [initialData, subscriptionId, open, userCurrency])

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!form.paymentDate) {
      newErrors.paymentDate = t('common:paymentDateRequired')
    }

    const amountValue = typeof form.amountPaid === 'string' ? parseFloat(form.amountPaid) : form.amountPaid;
    if (isNaN(amountValue) || amountValue < 0) {
      newErrors.amountPaid = t('common:amountNonNegative')
    }

    if (!form.currency) {
      newErrors.currency = t('common:currencyRequired')
    }

    if (!form.billingPeriodStart) {
      newErrors.billingPeriodStart = t('common:billingPeriodStartRequired')
    }

    if (!form.billingPeriodEnd) {
      newErrors.billingPeriodEnd = t('common:billingPeriodEndRequired')
    }

    if (form.billingPeriodStart && form.billingPeriodEnd) {
      const startDate = new Date(form.billingPeriodStart)
      const endDate = new Date(form.billingPeriodEnd)
      if (startDate >= endDate) {
        newErrors.billingPeriodEnd = t('common:endDateAfterStart')
      }
    }

    if (!form.status) {
      newErrors.status = t('common:statusRequired')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      // Convert Date objects to strings and ensure amountPaid is a number for API
      const amountValue = typeof form.amountPaid === 'string' ? parseFloat(form.amountPaid) : form.amountPaid;
      const submitData = {
        ...form,
        amountPaid: amountValue,
        paymentDate: format(form.paymentDate, "yyyy-MM-dd"),
        billingPeriodStart: format(form.billingPeriodStart, "yyyy-MM-dd"),
        billingPeriodEnd: format(form.billingPeriodEnd, "yyyy-MM-dd")
      }
      await onSubmit(submitData)
      onOpenChange(false) // Close sheet on successful submission
    } catch {
      // Error handling is done in the parent component
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle form field changes
  const handleFieldChange = (field: keyof PaymentFormData, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[400px] md:w-[500px] lg:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {initialData ? t('common:editPayment') : t('common:addPayment')}
          </SheetTitle>
          <SheetDescription>
            {subscriptionName}
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-4 py-4">
          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="paymentDate">{t('common:paymentDate')} *</Label>
            <DatePicker
              value={form.paymentDate}
              onChange={(date) => handleFieldChange("paymentDate", date || new Date())}
              placeholder={t('common:selectPaymentDate')}
              className={errors.paymentDate ? "border-destructive" : ""}
            />
            {errors.paymentDate && (
              <p className="text-sm text-destructive">{errors.paymentDate}</p>
            )}
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amountPaid">{t('common:amount')} *</Label>
              <Input
                id="amountPaid"
                type="number"
                step="0.01"
                min="0"
                value={form.amountPaid}
                onChange={(e) => handleFieldChange("amountPaid", e.target.value)}
                className={errors.amountPaid ? "border-destructive" : ""}
              />
              {errors.amountPaid && (
                <p className="text-sm text-destructive">{errors.amountPaid}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">{t('common:currency')} *</Label>
              <CurrencySelector
                value={form.currency}
                onValueChange={(value) => handleFieldChange("currency", value)}
                className={errors.currency ? "border-destructive" : ""}
              />
              {errors.currency && (
                <p className="text-sm text-destructive">{errors.currency}</p>
              )}
            </div>
          </div>

          {/* Billing Period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billingPeriodStart">{t('common:billingPeriodStart')} *</Label>
              <DatePicker
                value={form.billingPeriodStart}
                onChange={(date) => handleFieldChange("billingPeriodStart", date || new Date())}
                placeholder={t('common:selectStartDate')}
                className={errors.billingPeriodStart ? "border-destructive" : ""}
              />
              {errors.billingPeriodStart && (
                <p className="text-sm text-destructive">{errors.billingPeriodStart}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingPeriodEnd">{t('common:billingPeriodEnd')} *</Label>
              <DatePicker
                value={form.billingPeriodEnd}
                onChange={(date) => handleFieldChange("billingPeriodEnd", date || new Date())}
                placeholder={t('common:selectEndDate')}
                className={errors.billingPeriodEnd ? "border-destructive" : ""}
              />
              {errors.billingPeriodEnd && (
                <p className="text-sm text-destructive">{errors.billingPeriodEnd}</p>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">{t('common:status')} *</Label>
            <Select
              value={form.status}
              onValueChange={(value) => handleFieldChange("status", value)}
            >
              <SelectTrigger className={errors.status ? "border-destructive" : ""}>
                <SelectValue placeholder={t('common:selectStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="succeeded">{t('common:succeeded')}</SelectItem>
                <SelectItem value="failed">{t('common:failed')}</SelectItem>
                <SelectItem value="refunded">{t('common:refunded')}</SelectItem>
                <SelectItem value="pending">{t('common:pending')}</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-sm text-destructive">{errors.status}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t('common:notes')}</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => handleFieldChange("notes", e.target.value)}
              placeholder={t('common:optionalNotes')}
              rows={3}
            />
          </div>
        </div>

        <SheetFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            {t('common:cancel')}
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? t('common:updatePayment') : t('common:addPayment')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
