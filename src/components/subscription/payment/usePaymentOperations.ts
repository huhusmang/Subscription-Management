import { apiClient } from '@/utils/api-client'
import { useToast } from "@/hooks/use-toast"
import { useState } from 'react'
import { useConfirmation } from '@/hooks/use-confirmation'

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

export const usePaymentOperations = (
  fetchPaymentHistory: () => void
) => {
  const { toast } = useToast()
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null)

  const handleAddPayment = async (paymentData: PaymentApiData) => {
    try {
      await apiClient.post('/protected/payment-history', paymentData)
      
      toast({
        title: "Success",
        description: "Payment record created successfully",
      })
      fetchPaymentHistory()
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create payment'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }

  const handleEditPayment = async (paymentId: number, paymentData: PaymentApiData) => {
    try {
      await apiClient.put(`/protected/payment-history/${paymentId}`, paymentData)
      
      toast({
        title: "Success",
        description: "Payment record updated successfully",
      })
      fetchPaymentHistory()
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update payment'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }



  const handleDeletePayment = async () => {
    if (!deleteTarget) return

    try {
      await apiClient.delete(`/protected/payment-history/${deleteTarget.id}`)
      
      toast({
        title: "Success",
        description: "Payment record deleted successfully",
      })
      fetchPaymentHistory()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete payment'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
    
    setDeleteTarget(null)
  }
  
  const deleteConfirmation = useConfirmation({
    title: "Delete Payment Record",
    description: deleteTarget ? `Are you sure you want to delete this payment record for ${deleteTarget.name}? This action cannot be undone.` : "",
    confirmText: "Delete",
    onConfirm: handleDeletePayment,
  })
  
  const handleDeleteClick = (paymentId: number, subscriptionName: string) => {
    setDeleteTarget({ id: paymentId, name: subscriptionName })
    deleteConfirmation.openDialog()
  }

  return {
    handleAddPayment,
    handleEditPayment,
    handleDeleteClick,
    deleteConfirmation
  }
}
