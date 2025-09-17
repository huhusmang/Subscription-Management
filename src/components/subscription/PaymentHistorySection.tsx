import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useToast } from "@/hooks/use-toast"
import { PaymentRecord, PaymentRecordApi, transformPaymentsFromApi } from "@/utils/dataTransform"
import { PaymentHistorySheet } from "./PaymentHistorySheet"
import { apiClient } from '@/utils/api-client'
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

// Import sub-components
import { PaymentHistoryHeader } from "./payment/PaymentHistoryHeader"
import { PaymentListItem } from "./payment/PaymentListItem"
import { PaymentListState } from "./payment/PaymentListState"
import { usePaymentOperations } from "./payment/usePaymentOperations"

// The API client already extracts the data field, so we get the array directly
type PaymentHistoryApiResponse = PaymentRecordApi[]

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

interface PaymentHistorySectionProps {
  subscriptionId: number
  subscriptionName: string
}

export function PaymentHistorySection({ subscriptionId, subscriptionName }: PaymentHistorySectionProps) {
  const { t } = useTranslation(['common', 'subscription'])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null)
  const { toast } = useToast()
  


  // Fetch payment history for this subscription
  const fetchPaymentHistory = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const rawData = await apiClient.get<PaymentHistoryApiResponse>(`/payment-history?subscription_id=${subscriptionId}`)
      const transformedPayments = transformPaymentsFromApi(rawData)
      setPayments(transformedPayments)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load payment history'
      setError(errorMessage)
      toast({
        title: t('common:error'),
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [subscriptionId, toast, t])

  // Load payment history when component mounts
  useEffect(() => {
    fetchPaymentHistory()
  }, [fetchPaymentHistory])

  // Load payment operations hook
  const {
    handleAddPayment: addPayment,
    handleEditPayment: editPayment,
    handleDeleteClick,
    deleteConfirmation
  } = usePaymentOperations(fetchPaymentHistory)

  // Handle adding new payment
  const handleAddPayment = async (paymentData: PaymentApiData) => {
    await addPayment(paymentData)
    setShowAddForm(false)
  }

  // Handle editing payment
  const handleEditPayment = async (paymentData: PaymentApiData) => {
    if (!editingPayment) return
    await editPayment(editingPayment.id, paymentData)
    setEditingPayment(null)
  }

  // Filter payments based on search term
  const filteredPayments = payments.filter(payment =>
    payment.paymentDate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.amountPaid.toString().includes(searchTerm)
  )

  return (
    <div className="space-y-4">
      {/* Header with Add Button and Search */}
      <PaymentHistoryHeader
        paymentCount={filteredPayments.length}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onAddPayment={() => setShowAddForm(true)}
      />

      {/* Payment List */}
      <div className="space-y-2">
        <PaymentListState
          isLoading={isLoading}
          error={error}
          isEmpty={filteredPayments.length === 0}
          searchTerm={searchTerm}
          onRetry={fetchPaymentHistory}
        />
        
        {!isLoading && !error && filteredPayments.map((payment) => (
          <PaymentListItem
            key={payment.id}
            payment={payment}
            onEdit={setEditingPayment}
            onDelete={() => handleDeleteClick(payment.id, subscriptionName)}
          />
        ))}
      </div>

      {/* Payment History Sheet */}
      <PaymentHistorySheet
        open={showAddForm || editingPayment !== null}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddForm(false)
            setEditingPayment(null)
          }
        }}
        initialData={editingPayment || undefined}
        subscriptionId={subscriptionId}
        subscriptionName={subscriptionName}
        onSubmit={editingPayment ? handleEditPayment : handleAddPayment}
      />
      
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog {...deleteConfirmation.dialogProps} />
    </div>
  )
}
