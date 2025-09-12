import { useMemo } from 'react'
import { useSubscriptionStore, type Subscription } from './subscriptionStore'

interface SubscriptionStoreState {
  subscriptions: Subscription[]
}
import { useSettingsStore } from './settingsStore'
import { convertCurrency } from '@/utils/currency'

// Performance optimization hooks for subscription store
export const useSubscriptionStats = () => {
  const subscriptions = useSubscriptionStore(state => state.subscriptions)
  const userCurrency = useSettingsStore(state => state.currency)

  return useMemo(() => {
    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active')

    const totalMonthlySpending = activeSubscriptions.reduce((total, sub) => {
      const convertedAmount = convertCurrency(sub.amount, sub.currency, userCurrency)

      switch (sub.billingCycle) {
        case 'monthly':
          return total + convertedAmount
        case 'yearly':
          return total + (convertedAmount / 12)
        case 'quarterly':
          return total + (convertedAmount / 3)
        case 'semiannual':
          return total + (convertedAmount / 6)
        default:
          return total
      }
    }, 0)

    const totalYearlySpending = activeSubscriptions.reduce((total, sub) => {
      const convertedAmount = convertCurrency(sub.amount, sub.currency, userCurrency)

      switch (sub.billingCycle) {
        case 'monthly':
          return total + (convertedAmount * 12)
        case 'yearly':
          return total + convertedAmount
        case 'quarterly':
          return total + (convertedAmount * 4)
        case 'semiannual':
          return total + (convertedAmount * 2)
        default:
          return total
      }
    }, 0)

    const activeCount = activeSubscriptions.length

    return {
      totalMonthlySpending,
      totalYearlySpending,
      activeCount
    }
  }, [subscriptions, userCurrency])
}

export const useSpendingByCategory = () => {
  const subscriptions = useSubscriptionStore(state => state.subscriptions)
  const categories = useSubscriptionStore(state => state.categories)
  const userCurrency = useSettingsStore(state => state.currency)
  
  return useMemo(() => {
    const uniqueCategoryIds = [...new Set(subscriptions.map(sub => sub.categoryId).filter(id => id != null))]
    
    return uniqueCategoryIds.reduce((acc, categoryId) => {
      const category = categories.find(cat => cat.id === categoryId)
      const categoryValue = category?.value || 'other'
      
      const categoryTotal = subscriptions
        .filter(sub => sub.status === 'active' && sub.categoryId === categoryId)
        .reduce((total, sub) => {
          const convertedAmount = convertCurrency(sub.amount, sub.currency, userCurrency)
          
          switch (sub.billingCycle) {
            case 'monthly':
              return total + (convertedAmount * 12)
            case 'yearly':
              return total + convertedAmount
            case 'quarterly':
              return total + (convertedAmount * 4)
            default:
              return total
          }
        }, 0)
      
      acc[categoryValue] = categoryTotal
      return acc
    }, {} as Record<string, number>)
  }, [subscriptions, categories, userCurrency])
}

export const useUpcomingRenewals = (days: number = 30) => {
  const subscriptions = useSubscriptionStore(state => state.subscriptions)
  
  return useMemo(() => {
    const today = new Date()
    const cutoffDate = new Date(today)
    cutoffDate.setDate(cutoffDate.getDate() + days)
    
    return subscriptions.filter(sub => {
      if (sub.status !== 'active') return false
      const nextBilling = new Date(sub.nextBillingDate)
      return nextBilling >= today && nextBilling <= cutoffDate
    }).sort((a, b) => {
      return new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime()
    })
  }, [subscriptions, days])
}

export const useRecentlyPaid = (days: number = 7) => {
  const subscriptions = useSubscriptionStore(state => state.subscriptions)
  
  return useMemo(() => {
    const today = new Date()
    const cutoffDate = new Date(today)
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    return subscriptions.filter(sub => {
      if (!sub.lastBillingDate) return false
      const lastBilling = new Date(sub.lastBillingDate)
      return lastBilling >= cutoffDate && lastBilling <= today
    }).sort((a, b) => {
      return new Date(b.lastBillingDate!).getTime() - new Date(a.lastBillingDate!).getTime()
    })
  }, [subscriptions, days])
}

// Selector functions for optimized state access
export const selectActiveSubscriptions = (state: SubscriptionStoreState) =>
  state.subscriptions.filter((sub: Subscription) => sub.status === 'active')

export const selectSubscriptionById = (id: number) => (state: SubscriptionStoreState) =>
  state.subscriptions.find((sub: Subscription) => sub.id === id)

export const selectSubscriptionsByCategory = (categoryId: number) => (state: SubscriptionStoreState) =>
  state.subscriptions.filter((sub: Subscription) => sub.categoryId === categoryId)