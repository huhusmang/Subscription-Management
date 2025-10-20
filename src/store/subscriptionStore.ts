import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { convertCurrency } from '@/utils/currency'
import { useSettingsStore } from './settingsStore'

import { apiClient } from '@/utils/api-client'

interface SubscriptionApiData {
  id: number
  name: string
  plan: string
  billing_cycle: string
  next_billing_date: string
  last_billing_date?: string | null
  amount: number
  currency: string
  payment_method_id: number
  start_date: string
  status: string
  category_id: number
  renewal_type: string
  notes: string
  website?: string
  category?: { id: number; value: string; label: string }
  paymentMethod?: { id: number; value: string; label: string }
}

interface RenewalData {
  subscriptionId: number
  previousBillingDate: string
  newBillingDate: string
  amount: number
  currency: string
  renewedAt: string
}



// Helper to calculate the last billing date from the next one
const calculateLastBillingDate = (nextBillingDate: string, billingCycle: BillingCycle): string => {
  const nextDate = new Date(nextBillingDate)
  switch (billingCycle) {
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() - 1)
      break
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() - 1)
      break
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() - 3)
      break
    case 'semiannual':
      nextDate.setMonth(nextDate.getMonth() - 6)
      break
  }
  return nextDate.toISOString().split('T')[0]
}


// Helper function to transform data from API (snake_case) to frontend (camelCase)
const transformFromApi = (sub: SubscriptionApiData): Subscription => {
  return {
    id: sub.id,
    name: sub.name,
    plan: sub.plan,
    billingCycle: validateBillingCycle(sub.billing_cycle),
    nextBillingDate: sub.next_billing_date,
    lastBillingDate: sub.last_billing_date,
    amount: sub.amount,
    currency: sub.currency,
    paymentMethodId: sub.payment_method_id,
    startDate: sub.start_date,
    status: validateStatus(sub.status),
    categoryId: sub.category_id,
    renewalType: validateRenewalType(sub.renewal_type),
    notes: sub.notes,
    website: sub.website,
    // Optional display fields populated by joins
    paymentMethod: sub.paymentMethod,
    category: sub.category,
  }
}

// Helper function to transform data from frontend (camelCase) to API (snake_case)
export const transformToApi = (sub: Partial<Subscription>) => {
  const result: Record<string, unknown> = {}
  if (sub.name !== undefined) result.name = sub.name
  if (sub.plan !== undefined) result.plan = sub.plan
  if (sub.billingCycle !== undefined) result.billing_cycle = sub.billingCycle
  if (sub.nextBillingDate !== undefined) result.next_billing_date = sub.nextBillingDate
  if (sub.lastBillingDate !== undefined) result.last_billing_date = sub.lastBillingDate
  if (sub.amount !== undefined) result.amount = sub.amount
  if (sub.currency !== undefined) result.currency = sub.currency
  if (sub.paymentMethodId !== undefined) result.payment_method_id = sub.paymentMethodId
  if (sub.startDate !== undefined) result.start_date = sub.startDate
  if (sub.status !== undefined) result.status = sub.status
  if (sub.categoryId !== undefined) result.category_id = sub.categoryId
  if (sub.renewalType !== undefined) result.renewal_type = sub.renewalType
  if (sub.notes !== undefined) result.notes = sub.notes
  if (sub.website !== undefined) result.website = sub.website
  return result
}

export type SubscriptionStatus = 'active' | 'trial' | 'cancelled'
export type BillingCycle = 'monthly' | 'yearly' | 'quarterly' | 'semiannual'
export type RenewalType = 'auto' | 'manual'
// Updated to allow custom categories
export type SubscriptionCategory = 'video' | 'music' | 'software' | 'cloud' | 'news' | 'game' | 'other' | string

// Helper functions to validate and cast enum types from API
const validateStatus = (status: string): SubscriptionStatus => {
  if (status === 'active' || status === 'trial' || status === 'cancelled') {
    return status as SubscriptionStatus
  }
  return 'active' // default fallback
}

const validateBillingCycle = (billingCycle: string): BillingCycle => {
  if (billingCycle === 'monthly' || billingCycle === 'yearly' || billingCycle === 'quarterly' || billingCycle === 'semiannual') {
    return billingCycle as BillingCycle
  }
  return 'monthly' // default fallback
}

const validateRenewalType = (renewalType: string | null): RenewalType => {
  if (renewalType === 'auto' || renewalType === 'manual') {
    return renewalType as RenewalType
  }
  return 'manual' // default fallback
}

export interface Subscription {
  id: number // Changed from string to number
  name: string
  plan: string
  billingCycle: BillingCycle
  nextBillingDate: string
  lastBillingDate: string | null
  amount: number
  currency: string
  paymentMethodId: number // Changed to foreign key
  startDate: string
  status: SubscriptionStatus
  categoryId: number // Changed to foreign key
  renewalType: RenewalType
  notes: string
  website?: string
  // Optional fields for display purposes (populated by joins)
  category?: CategoryOption
  paymentMethod?: PaymentMethodOption
}

// Define the structured options
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

interface SubscriptionPlanOption {
  value: string
  label: string
  service?: string // Optional association with specific service
}

interface SubscriptionState {
  subscriptions: Subscription[]
  // Custom options for dropdowns
  categories: CategoryOption[]
  paymentMethods: PaymentMethodOption[]
  subscriptionPlans: SubscriptionPlanOption[]
  isLoading: boolean
  error: string | null

  // CRUD operations
  addSubscription: (subscription: Omit<Subscription, 'id' | 'lastBillingDate'>) => Promise<{ error: unknown | null }>
  bulkAddSubscriptions: (subscriptions: Omit<Subscription, 'id' | 'lastBillingDate'>[]) => Promise<{ error: unknown | null }>
  updateSubscription: (id: number, subscription: Partial<Subscription>) => Promise<{ error: unknown | null }>
  deleteSubscription: (id: number) => Promise<{ error: unknown | null }>
  resetSubscriptions: () => void
  fetchSubscriptions: () => Promise<void>
  fetchCategories: () => Promise<void>
  fetchPaymentMethods: () => Promise<void>

  // Renewal operations
  processAutoRenewals: (skipRefresh?: boolean) => Promise<{ processed: number; errors: number }>
  processExpiredSubscriptions: (skipRefresh?: boolean) => Promise<{ processed: number; errors: number }>
  manualRenewSubscription: (id: number) => Promise<{ error: unknown | null; renewalData: unknown | null }>

  // Combined initialization
  initializeWithRenewals: () => Promise<void>
  initializeData: () => Promise<void>

  // Option management
  addCategory: (category: CategoryOption) => Promise<void>
  editCategory: (oldValue: string, newCategory: CategoryOption) => Promise<void>
  deleteCategory: (value: string) => Promise<void>
  addPaymentMethod: (paymentMethod: PaymentMethodOption) => Promise<void>
  editPaymentMethod: (oldValue: string, newPaymentMethod: PaymentMethodOption) => Promise<void>
  deletePaymentMethod: (value: string) => Promise<void>
  addSubscriptionPlan: (plan: SubscriptionPlanOption) => void
  editSubscriptionPlan: (oldValue: string, newPlan: SubscriptionPlanOption) => void
  deleteSubscriptionPlan: (value: string) => void
  
  // Stats and analytics
  getTotalMonthlySpending: () => number
  getTotalYearlySpending: () => number
  getUpcomingRenewals: (days: number) => Subscription[]
  getRecentlyPaid: (days: number) => Subscription[]
  getSpendingByCategory: () => Record<string, number>
  
  // Get unique categories from subscriptions
  getUniqueCategories: () => CategoryOption[]
}

// Initial options
const initialCategories: CategoryOption[] = [
  { id: 1, value: 'video', label: 'Video Streaming' },
  { id: 2, value: 'music', label: 'Music Streaming' },
  { id: 3, value: 'software', label: 'Software' },
  { id: 4, value: 'cloud', label: 'Cloud Storage' },
  { id: 5, value: 'news', label: 'News & Magazines' },
  { id: 6, value: 'game', label: 'Games' },
  { id: 7, value: 'productivity', label: 'Productivity' },
  { id: 8, value: 'education', label: 'Education' },
  { id: 9, value: 'finance', label: 'Finance' },
  { id: 11, value: 'other', label: 'Other' }
]

const initialPaymentMethods: PaymentMethodOption[] = [
  { id: 1, value: 'creditcard', label: 'Credit Card' },
  { id: 2, value: 'debitcard', label: 'Debit Card' },
  { id: 3, value: 'paypal', label: 'PayPal' },
  { id: 4, value: 'applepay', label: 'Apple Pay' },
  { id: 5, value: 'googlepay', label: 'Google Pay' },
  { id: 6, value: 'banktransfer', label: 'Bank Transfer' },
  { id: 7, value: 'crypto', label: 'Cryptocurrency' },
  { id: 8, value: 'other', label: 'Other' }
]

const initialSubscriptionPlans: SubscriptionPlanOption[] = [
  { value: 'netflix-basic', label: 'Basic', service: 'Netflix' },
  { value: 'netflix-standard', label: 'Standard', service: 'Netflix' },
  { value: 'netflix-premium', label: 'Premium', service: 'Netflix' },
  { value: 'spotify-individual', label: 'Individual', service: 'Spotify' },
  { value: 'spotify-duo', label: 'Duo', service: 'Spotify' },
  { value: 'spotify-family', label: 'Family', service: 'Spotify' },
  { value: 'apple-50gb', label: '50GB Storage', service: 'iCloud' },
  { value: 'apple-200gb', label: '200GB Storage', service: 'iCloud' },
  { value: 'apple-2tb', label: '2TB Storage', service: 'iCloud' },
  { value: 'microsoft-personal', label: 'Personal', service: 'Microsoft 365' },
  { value: 'microsoft-family', label: 'Family', service: 'Microsoft 365' },
  { value: 'youtube-individual', label: 'Individual', service: 'YouTube Premium' },
  { value: 'youtube-family', label: 'Family', service: 'YouTube Premium' }
]

// Create store with persistence
export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      subscriptions: [],
      categories: initialCategories,
      paymentMethods: initialPaymentMethods,
      subscriptionPlans: initialSubscriptionPlans,
      isLoading: false,
      error: null,
      
      // Fetch subscriptions from the backend API
      fetchSubscriptions: async () => {
        set({ isLoading: true, error: null })
        try {
          const data = await apiClient.get<SubscriptionApiData[]>('/subscriptions')

          const transformedData = data.map(transformFromApi)
          set({ subscriptions: transformedData, isLoading: false })
        } catch (error: unknown) {
          console.error('Error fetching subscriptions:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
          set({ error: errorMessage, isLoading: false, subscriptions: [] }) // Clear subscriptions on error
        }
      },

      // Fetch categories from API
      fetchCategories: async () => {
        try {
          const data = await apiClient.get<CategoryOption[]>('/categories')

          set({ categories: data })
        } catch (error) {
          console.error('Error fetching categories:', error)
        }
      },

      // Fetch payment methods from API
      fetchPaymentMethods: async () => {
        try {
          const data = await apiClient.get<PaymentMethodOption[]>('/payment-methods')

          set({ paymentMethods: data })
        } catch (error) {
          console.error('Error fetching payment methods:', error)
        }
      },
      
      // Add a new subscription
      addSubscription: async (subscription) => {
        try {
          const subscriptionWithLastBilling = {
            ...subscription,
            lastBillingDate: calculateLastBillingDate(
              subscription.nextBillingDate,
              subscription.billingCycle
            )
          }
          const apiSubscription = transformToApi(subscriptionWithLastBilling)
          await apiClient.post('/protected/subscriptions', apiSubscription)

          // Refetch all subscriptions to get the new one with its DB-generated ID
          await get().fetchSubscriptions()
          return { error: null }
        } catch (error: unknown) {
          console.error('Error adding subscription:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
          set({ error: errorMessage })
          return { error }
        }
      },
      
      // Bulk add subscriptions
      bulkAddSubscriptions: async (subscriptions) => {
        try {
          const apiSubscriptions = subscriptions.map(sub => {
            const subWithLastBilling = {
              ...sub,
              lastBillingDate: calculateLastBillingDate(
                sub.nextBillingDate,
                sub.billingCycle
              )
            };
            return transformToApi(subWithLastBilling);
          });

          await apiClient.post('/protected/subscriptions/bulk', apiSubscriptions);

          await get().fetchSubscriptions();
          return { error: null };
        } catch (error: unknown) {
          console.error('Error bulk adding subscriptions:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
          set({ error: errorMessage });
          return { error };
        }
      },

      // Update an existing subscription
      updateSubscription: async (id, updatedSubscription) => {
        try {
          const originalSubscription = get().subscriptions.find(sub => sub.id === id)
          const subscriptionWithLastBilling = { ...updatedSubscription }

          if (originalSubscription && updatedSubscription.nextBillingDate && updatedSubscription.nextBillingDate !== originalSubscription.nextBillingDate) {
            const billingCycle = updatedSubscription.billingCycle || originalSubscription.billingCycle
            subscriptionWithLastBilling.lastBillingDate = calculateLastBillingDate(
              updatedSubscription.nextBillingDate,
              billingCycle
            )
          }
          const apiSubscription = transformToApi(subscriptionWithLastBilling)
          await apiClient.put(`/protected/subscriptions/${id}`, apiSubscription)
          
          // Refetch to ensure data consistency
          await get().fetchSubscriptions()
          return { error: null }
        } catch (error: unknown) {
          console.error('Error updating subscription:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
          set({ error: errorMessage })
          return { error: errorMessage }
        }
      },
      
      // Delete a subscription
      deleteSubscription: async (id) => {
        try {
          await apiClient.delete(`/protected/subscriptions/${id}`)

          // Refetch to reflect the deletion
          await get().fetchSubscriptions()
          return { error: null }
        } catch (error: unknown) {
          console.error('Error deleting subscription:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
          set({ error: errorMessage })
          return { error: errorMessage }
        }
      },

      // Reset subscriptions by calling the backend endpoint
      resetSubscriptions: async () => {
        try {
          await apiClient.post('/protected/subscriptions/reset');

          // Refetch to ensure the UI is cleared
          await get().fetchSubscriptions();
          return { error: null };
        } catch (error: unknown) {
          console.error('Error resetting subscriptions:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          set({ error: errorMessage });
          return { error: errorMessage };
        }
      },
      
      // Add a new category option
      addCategory: async (category) => {
        try {
          await apiClient.post('/protected/categories', category);

          // Refresh categories from server
          await get().fetchCategories();
        } catch (error) {
          console.error('Error adding category:', error);
          throw error;
        }
      },

      // Edit a category option
      editCategory: async (oldValue, newCategory) => {
        try {
          await apiClient.put(`/protected/categories/${encodeURIComponent(oldValue)}`, newCategory);

          // Refresh categories from server
          await get().fetchCategories();
        } catch (error) {
          console.error('Error updating category:', error);
          throw error;
        }
      },

      // Delete a category option
      deleteCategory: async (value) => {
        try {
          await apiClient.delete(`/protected/categories/${encodeURIComponent(value)}`);

          // Refresh categories from server
          await get().fetchCategories();
        } catch (error) {
          console.error('Error deleting category:', error);
          throw error;
        }
      },

      // Add a new payment method option
      addPaymentMethod: async (paymentMethod) => {
        try {
          await apiClient.post('/protected/payment-methods', paymentMethod);

          // Refresh payment methods from server
          await get().fetchPaymentMethods();
        } catch (error) {
          console.error('Error adding payment method:', error);
          throw error;
        }
      },

      // Edit a payment method option
      editPaymentMethod: async (oldValue, newPaymentMethod) => {
        try {
          await apiClient.put(`/protected/payment-methods/${encodeURIComponent(oldValue)}`, newPaymentMethod);

          // Refresh payment methods from server
          await get().fetchPaymentMethods();
        } catch (error) {
          console.error('Error updating payment method:', error);
          throw error;
        }
      },

      // Delete a payment method option
      deletePaymentMethod: async (value) => {
        try {
          await apiClient.delete(`/protected/payment-methods/${encodeURIComponent(value)}`);

          // Refresh payment methods from server
          await get().fetchPaymentMethods();
        } catch (error) {
          console.error('Error deleting payment method:', error);
          throw error;
        }
      },

      // Add a new subscription plan option
      addSubscriptionPlan: (plan) => set((state) => {
        if (state.subscriptionPlans.some(p => p.value === plan.value)) {
          return state; // Plan already exists
        }
        return { subscriptionPlans: [...state.subscriptionPlans, plan] };
      }),

      // Edit a subscription plan option
      editSubscriptionPlan: (oldValue, newPlan) => set((state) => {
        const index = state.subscriptionPlans.findIndex(p => p.value === oldValue);
        if (index === -1) return state; // Plan not found

        const updatedPlans = [...state.subscriptionPlans];
        updatedPlans[index] = newPlan;
        return { subscriptionPlans: updatedPlans };
      }),

      // Delete a subscription plan option
      deleteSubscriptionPlan: (value) => set((state) => {
        return { subscriptionPlans: state.subscriptionPlans.filter(p => p.value !== value) };
      }),
      
      // Get total monthly spending
      getTotalMonthlySpending: () => {
        const { subscriptions } = get();
        const { currency: userCurrency } = useSettingsStore.getState();
        
        return subscriptions
          .filter(sub => sub.status === 'active')
          .reduce((total, sub) => {
            // Convert the amount to user's preferred currency
            const convertedAmount = convertCurrency(sub.amount, sub.currency, userCurrency);
            
            switch (sub.billingCycle) {
              case 'monthly':
                return total + convertedAmount;
              case 'yearly':
                return total + (convertedAmount / 12);
              case 'quarterly':
                return total + (convertedAmount / 3);
              case 'semiannual':
                return total + (convertedAmount / 6);
              default:
                return total;
            }
          }, 0);
      },
      
      // Get total yearly spending
      getTotalYearlySpending: () => {
        const { subscriptions } = get();
        const { currency: userCurrency } = useSettingsStore.getState();
        
        return subscriptions
          .filter(sub => sub.status === 'active')
          .reduce((total, sub) => {
            // Convert the amount to user's preferred currency
            const convertedAmount = convertCurrency(sub.amount, sub.currency, userCurrency);
            
            switch (sub.billingCycle) {
              case 'monthly':
                return total + (convertedAmount * 12);
              case 'yearly':
                return total + convertedAmount;
              case 'quarterly':
                return total + (convertedAmount * 4);
              case 'semiannual':
                return total + (convertedAmount * 2);
              default:
                return total;
            }
          }, 0);
      },
      
      // Get upcoming renewals for the next N days
      getUpcomingRenewals: (days) => {
        const { subscriptions } = get()
        const today = new Date()
        today.setHours(0, 0, 0, 0) // Set to start of day for accurate comparison
        const futureDate = new Date()
        futureDate.setDate(today.getDate() + days)
        futureDate.setHours(23, 59, 59, 999) // Set to end of day

        return subscriptions
          .filter(sub => {
            const billingDate = new Date(sub.nextBillingDate)
            billingDate.setHours(0, 0, 0, 0) // Set to start of day for accurate comparison
            return sub.status === 'active' &&
                   billingDate >= today &&
                   billingDate <= futureDate
          })
          .sort((a, b) =>
            new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime()
          )
      },
      
      // Get recently paid subscriptions for the last N days
      getRecentlyPaid: (days) => {
        const { subscriptions } = get()
        const today = new Date()
        today.setHours(23, 59, 59, 999) // Set to end of day to include today
        const pastDate = new Date()
        pastDate.setDate(today.getDate() - days)
        pastDate.setHours(0, 0, 0, 0) // Set to start of day

        return subscriptions
          .filter(sub => {
            if (!sub.lastBillingDate) return false
            const billingDate = new Date(sub.lastBillingDate)
            billingDate.setHours(0, 0, 0, 0) // Set to start of day for accurate comparison
            return billingDate >= pastDate && billingDate <= today
          })
          .sort((a, b) =>
            new Date(b.lastBillingDate!).getTime() - new Date(a.lastBillingDate!).getTime()
          )
      },
      
      // Get spending by category
      getSpendingByCategory: () => {
        const { subscriptions, categories } = get();
        const { currency: userCurrency } = useSettingsStore.getState();

        // Get all unique category IDs from subscriptions
        const uniqueCategoryIds = [...new Set(subscriptions.map(sub => sub.categoryId).filter(id => id != null))];

        return uniqueCategoryIds.reduce((acc, categoryId) => {
          const category = categories.find(cat => cat.id === categoryId);
          const categoryValue = category?.value || 'other';

          const categoryTotal = subscriptions
            .filter(sub => sub.status === 'active' && sub.categoryId === categoryId)
            .reduce((total, sub) => {
              // Convert the amount to user's preferred currency
              const convertedAmount = convertCurrency(sub.amount, sub.currency, userCurrency);

              switch (sub.billingCycle) {
                case 'monthly':
                  return total + (convertedAmount * 12);
                case 'yearly':
                  return total + convertedAmount;
                case 'quarterly':
                  return total + (convertedAmount * 4);
                case 'semiannual':
                  return total + (convertedAmount * 2);
                default:
                  return total;
              }
            }, 0);

          acc[categoryValue] = categoryTotal;
          return acc;
        }, {} as Record<string, number>);
      },
      
      // Get unique categories from actual subscriptions
      getUniqueCategories: () => {
        const { subscriptions, categories } = get()

        // Get all unique category IDs from subscriptions
        const usedCategoryIds = [...new Set(subscriptions.map(sub => sub.categoryId).filter(id => id != null))]

        // Map these to full category objects
        return usedCategoryIds.map(categoryId => {
          const existingCategory = categories.find(cat => cat.id === categoryId)
          if (existingCategory) return existingCategory

          // Fallback for categories not found in the predefined list
          return { id: categoryId, value: 'other', label: 'Other' }
        }).filter(Boolean) // Remove any null/undefined entries
      },

      // Process automatic renewals for subscriptions that are due
      processAutoRenewals: async (skipRefresh = false) => {
        try {
          const result = await apiClient.post<{ processed: number; errors: number }>('/protected/subscriptions/auto-renew')

          // Only refresh subscriptions if not skipped and there were changes
          if (!skipRefresh && result.processed > 0) {
            await get().fetchSubscriptions()
          }

          return { processed: result.processed, errors: result.errors }
        } catch (error: unknown) {
          console.error('Error processing auto renewals:', error)
          return { processed: 0, errors: 1 }
        }
      },

      // Process expired manual subscriptions
      processExpiredSubscriptions: async (skipRefresh = false) => {
        try {
          const result = await apiClient.post<{ processed: number; errors: number }>('/protected/subscriptions/process-expired')

          // Only refresh subscriptions if not skipped and there were changes
          if (!skipRefresh && result.processed > 0) {
            await get().fetchSubscriptions()
          }

          return { processed: result.processed, errors: result.errors }
        } catch (error: unknown) {
          console.error('Error processing expired subscriptions:', error)
          return { processed: 0, errors: 1 }
        }
      },

      // Manual renewal for a specific subscription
      manualRenewSubscription: async (id: number) => {
        try {
          const result = await apiClient.post<{ renewalData: RenewalData }>(`/protected/subscriptions/${id}/manual-renew`)

          // Refresh subscriptions to get updated data
          await get().fetchSubscriptions()

          return { error: null, renewalData: result.renewalData }
        } catch (error: unknown) {
          console.error('Error renewing subscription:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
          return { error: errorMessage, renewalData: null }
        }
      },

      // Simple initialization method without auto-renewals
      initializeData: async () => {
        set({ isLoading: true, error: null })
        try {
          // Fetch all data in parallel
          await Promise.all([
            get().fetchSubscriptions(),
            get().fetchCategories(),
            get().fetchPaymentMethods()
          ])
          set({ isLoading: false })
        } catch (error: unknown) {
          console.error('Error during initialization:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
          set({ error: errorMessage, isLoading: false })
        }
      },

      // Combined initialization method with renewals (for manual trigger)
      initializeWithRenewals: async () => {
        set({ isLoading: true, error: null })
        try {
          // First fetch all data in parallel
          await Promise.all([
            get().fetchSubscriptions(),
            get().fetchCategories(),
            get().fetchPaymentMethods()
          ])

          // Then process renewals without additional fetches
          const [autoRenewalResult, expiredResult] = await Promise.all([
            get().processAutoRenewals(true), // Skip refresh
            get().processExpiredSubscriptions(true) // Skip refresh
          ])

          // Only fetch once more if there were any changes
          if (autoRenewalResult.processed > 0 || expiredResult.processed > 0) {
            await get().fetchSubscriptions()

            if (autoRenewalResult.processed > 0) {
              console.log(`Auto-renewed ${autoRenewalResult.processed} subscription(s)`)
            }
            if (expiredResult.processed > 0) {
              console.log(`Cancelled ${expiredResult.processed} expired subscription(s)`)
            }
          }

          if (autoRenewalResult.errors > 0) {
            console.warn(`Failed to auto-renew ${autoRenewalResult.errors} subscription(s)`)
          }
          if (expiredResult.errors > 0) {
            console.warn(`Failed to cancel ${expiredResult.errors} expired subscription(s)`)
          }
          set({ isLoading: false })
        } catch (error: unknown) {
          console.error('Error during initialization:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
          set({ error: errorMessage, isLoading: false })
        }
      }
    }),
    {
      name: 'subscription-storage',
      // Only persist subscription plans now, categories and payment methods are fetched from API
      partialize: (state) => ({
        subscriptionPlans: state.subscriptionPlans,
      })
    }
  )
)
