import { parseCSVToSubscriptions } from "@/lib/subscription-utils"
import { SubscriptionImportData } from "./types"
import { SubscriptionStatus, BillingCycle, RenewalType } from "@/store/subscriptionStore"

interface SubscriptionRawData {
  name?: string
  plan?: string
  billingCycle?: string
  nextBillingDate?: string
  amount?: number | string
  currency?: string
  paymentMethodId?: number
  startDate?: string
  status?: string
  categoryId?: number
  renewalType?: string
  notes?: string
  website?: string
}

interface JsonDataWithState {
  state?: {
    subscriptions?: SubscriptionRawData[]
  }
}

interface JsonDataWithSubscriptions {
  subscriptions?: SubscriptionRawData[]
}

// Helper functions to validate and cast enum types
const validateStatus = (status: string | undefined): SubscriptionStatus => {
  if (status === 'active' || status === 'trial' || status === 'cancelled') {
    return status as SubscriptionStatus
  }
  return 'active' // default fallback
}

const validateBillingCycle = (billingCycle: string | undefined): BillingCycle => {
  if (billingCycle === 'monthly' || billingCycle === 'yearly' || billingCycle === 'quarterly' || billingCycle === 'semiannual') {
    return billingCycle as BillingCycle
  }
  return 'monthly' // default fallback
}

const validateRenewalType = (renewalType: string | undefined): RenewalType => {
  if (renewalType === 'auto' || renewalType === 'manual') {
    return renewalType as RenewalType
  }
  return 'manual' // default fallback
}

export const parseFileContent = (
  file: File,
  content: string,
  setSubscriptions: (subs: SubscriptionImportData[]) => void,
  setErrors: (errors: string[]) => void
) => {
  try {
    // Check file type based on extension
    if (file.name.endsWith('.csv')) {
      // Parse CSV file
      const result = parseCSVToSubscriptions(content)
      setSubscriptions(result.subscriptions)
      setErrors(result.errors)
    } else if (file.name.endsWith('.json')) {
      // Parse JSON file
      const data = JSON.parse(content)
      
      // Check if it's our storage format
      const dataWithState = data as JsonDataWithState
      if (dataWithState.state?.subscriptions && Array.isArray(dataWithState.state.subscriptions)) {
        setSubscriptions(dataWithState.state.subscriptions.map((sub: SubscriptionRawData) => ({
          name: sub.name || 'Unknown Subscription',
          plan: sub.plan || 'Basic',
          billingCycle: validateBillingCycle(sub.billingCycle),
          nextBillingDate: sub.nextBillingDate || new Date().toISOString().split('T')[0],
          amount: Number(sub.amount) || 0,
          currency: sub.currency || 'USD',
          paymentMethodId: sub.paymentMethodId || 1,
          startDate: sub.startDate || new Date().toISOString().split('T')[0],
          status: validateStatus(sub.status),
          categoryId: sub.categoryId || 10,
          renewalType: validateRenewalType(sub.renewalType),
          notes: sub.notes || '',
          website: sub.website || '',
        })))
      } else if (Array.isArray(data)) {
        // Check if it's a direct array of subscriptions
        if (data.length > 0 && 'name' in data[0] && 'amount' in data[0]) {
          setSubscriptions((data as SubscriptionRawData[]).map((sub: SubscriptionRawData) => ({
            name: sub.name || 'Unknown Subscription',
            plan: sub.plan || 'Basic',
            billingCycle: validateBillingCycle(sub.billingCycle),
            nextBillingDate: sub.nextBillingDate || new Date().toISOString().split('T')[0],
            amount: Number(sub.amount) || 0,
            currency: sub.currency || 'USD',
            paymentMethodId: sub.paymentMethodId || 1,
            startDate: sub.startDate || new Date().toISOString().split('T')[0],
            status: validateStatus(sub.status),
            categoryId: sub.categoryId || 10,
            renewalType: validateRenewalType(sub.renewalType),
            notes: sub.notes || '',
            website: sub.website || '',
          })))
        } else {
          setErrors(['Invalid JSON format. Expected an array of subscription objects.'])
        }
      } else if ('subscriptions' in data && Array.isArray(data.subscriptions)) {
        // Format with direct subscriptions property
        const dataWithSubs = data as JsonDataWithSubscriptions
        setSubscriptions(dataWithSubs.subscriptions!.map((sub: SubscriptionRawData) => ({
          name: sub.name || 'Unknown Subscription',
          plan: sub.plan || 'Basic',
          billingCycle: validateBillingCycle(sub.billingCycle),
          nextBillingDate: sub.nextBillingDate || new Date().toISOString().split('T')[0],
          amount: Number(sub.amount) || 0,
          currency: sub.currency || 'USD',
          paymentMethodId: sub.paymentMethodId || 1,
          startDate: sub.startDate || new Date().toISOString().split('T')[0],
          status: validateStatus(sub.status),
          categoryId: sub.categoryId || 10,
          renewalType: validateRenewalType(sub.renewalType),
          notes: sub.notes || '',
          website: sub.website || '',
        })))
      } else {
        setErrors(['Invalid JSON format. Expected a subscription data structure.'])
      }
    } else {
      setErrors(['Unsupported file format. Please upload a CSV or JSON file.'])
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    setErrors([`Error parsing file: ${errorMessage}`])
  }
}