import { Subscription } from "@/store/subscriptionStore"
import { convertCurrency } from "@/utils/currency"

export interface ExpenseData {
  date: string
  amount: number
  category: string
  subscription: Subscription
}

export interface MonthlyExpense {
  month: string
  year: number
  amount: number
  subscriptionCount: number
}

export interface YearlyExpense {
  year: number
  amount: number
  subscriptionCount: number
}

export interface CategoryExpense {
  category: string
  amount: number
  percentage: number
  subscriptionCount: number
}

export interface ExpenseTrend {
  period: string
  amount: number
  change: number
  changePercentage: number
}

export interface ExpenseMetrics {
  totalSpent: number
  averageMonthly: number
  averagePerSubscription: number
  highestMonth: MonthlyExpense | null
  lowestMonth: MonthlyExpense | null
  growthRate: number
}

/**
 * Calculate the monthly cost of a subscription in user's preferred currency
 */
export function calculateMonthlyAmount(subscription: Subscription, targetCurrency: string): number {
  const convertedAmount = convertCurrency(subscription.amount, subscription.currency, targetCurrency)
  
  switch (subscription.billingCycle) {
    case 'monthly':
      return convertedAmount
    case 'yearly':
      return convertedAmount / 12
    case 'quarterly':
      return convertedAmount / 3
    case 'semiannual':
      return convertedAmount / 6
    default:
      return convertedAmount
  }
}

/**
 * Checks if a subscription should be included in a given month's expense calculation
 * based on the following billing logic rules:
 *
 * 1. 服务期内 (Next payment > 当前月份): 只要订阅已经开始，这个月就应该计入费用
 * 2. 当月开始并到期 (Next payment = 当前月份 且 startDate = 当前月份): 这个月也应该计入费用
 * 3. 当月到期但非当月开始 (Next payment = 当前月份 但 startDate < 当前月份): 不计入本月费用
 */
export function isSubscriptionActiveInMonth(
  subscription: Subscription,
  targetMonth: Date
): boolean {
  if (subscription.status !== 'active') {
    return false;
  }

  const subStart = new Date(subscription.startDate);
  const nextBilling = new Date(subscription.nextBillingDate);

  // Normalize all dates to the first of the month to compare months easily
  const targetMonthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
  const nextBillingMonthStart = new Date(nextBilling.getFullYear(), nextBilling.getMonth(), 1);
  const subStartMonthStart = new Date(subStart.getFullYear(), subStart.getMonth(), 1);

  // Rule 1: 服务期内 (Next payment > 当前月份)
  // 只要订阅已经开始，这个月就应该计入费用
  if (nextBillingMonthStart > targetMonthStart) {
    return targetMonthStart >= subStartMonthStart;
  }

  // Rule 2: 当月开始并到期 (Next payment = 当前月份 且 startDate = 当前月份)
  // 这个月也应该计入费用
  if (nextBillingMonthStart.getTime() === targetMonthStart.getTime()) {
    return subStartMonthStart.getTime() === targetMonthStart.getTime();
  }

  // Rule 3: 当月到期但非当月开始 (Next payment = 当前月份 但 startDate < 当前月份)
  // 不计入本月费用 (已经在上面的条件中处理，这里返回 false)
  return false;
}

/**
 * Generate expense data for a subscription over a date range.
 * It iterates through each month in the range and includes the subscription's
 * prorated monthly cost if it was active in that month.
 */
export function generateExpenseData(
  subscription: Subscription,
  startDate: Date,
  endDate: Date,
  targetCurrency: string
): ExpenseData[] {
  const expenses: ExpenseData[] = []
  
  // Skip non-active subscriptions immediately
  if (subscription.status !== 'active') {
    return expenses
  }

  const monthlyAmount = calculateMonthlyAmount(subscription, targetCurrency)

  // Iterate through each month in the given date range
  const currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  
  while (currentMonth <= endDate) {
    if (isSubscriptionActiveInMonth(subscription, currentMonth)) {
      expenses.push({
        date: `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-01`,
        amount: monthlyAmount,
        category: subscription.category?.value || 'other', // Use category value or fallback
        subscription
      })
    }
    
    // Move to the next month
    currentMonth.setMonth(currentMonth.getMonth() + 1)
  }
  
  return expenses
}

/**
 * Get monthly expense summary for a given period
 */
export function getMonthlyExpenses(
  subscriptions: Subscription[],
  startDate: Date,
  endDate: Date,
  targetCurrency: string
): MonthlyExpense[] {
  const monthlyMap = new Map<string, { amount: number; subscriptions: Set<number> }>()

  subscriptions.forEach(subscription => {
    const expenseData = generateExpenseData(subscription, startDate, endDate, targetCurrency)

    expenseData.forEach(expense => {
      const date = new Date(expense.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { amount: 0, subscriptions: new Set() })
      }

      const monthData = monthlyMap.get(monthKey)!
      monthData.amount += expense.amount
      monthData.subscriptions.add(subscription.id)
    })
  })

  return Array.from(monthlyMap.entries())
    .map(([monthKey, data]) => {
      const [year, month] = monthKey.split('-')
      return {
        monthKey, // 保留原始的 monthKey 用于排序
        month: new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric'
        }),
        year: parseInt(year),
        monthNumber: parseInt(month), // 添加月份数字用于排序
        amount: data.amount,
        subscriptionCount: data.subscriptions.size
      }
    })
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.monthNumber - b.monthNumber
    })
    .map(({ ...rest }) => rest) // 移除临时字段
}

/**
 * Get yearly expense summary for a given period
 */
export function getYearlyExpenses(
  subscriptions: Subscription[],
  startDate: Date,
  endDate: Date,
  targetCurrency: string
): YearlyExpense[] {
  const yearlyMap = new Map<number, { amount: number; subscriptions: Set<number> }>()

  subscriptions.forEach(subscription => {
    const expenseData = generateExpenseData(subscription, startDate, endDate, targetCurrency)

    expenseData.forEach(expense => {
      const date = new Date(expense.date)
      const year = date.getFullYear()

      if (!yearlyMap.has(year)) {
        yearlyMap.set(year, { amount: 0, subscriptions: new Set() })
      }

      const yearData = yearlyMap.get(year)!
      yearData.amount += expense.amount
      yearData.subscriptions.add(subscription.id)
    })
  })

  return Array.from(yearlyMap.entries())
    .map(([year, data]) => ({
      year,
      amount: data.amount,
      subscriptionCount: data.subscriptions.size
    }))
    .sort((a, b) => a.year - b.year)
}

/**
 * Get expense breakdown by category
 */
export function getCategoryExpenses(
  subscriptions: Subscription[],
  startDate: Date,
  endDate: Date,
  targetCurrency: string
): CategoryExpense[] {
  const categoryMap = new Map<string, { amount: number; subscriptions: Set<number> }>()
  let totalAmount = 0
  
  subscriptions.forEach(subscription => {
    const expenseData = generateExpenseData(subscription, startDate, endDate, targetCurrency)
    const subscriptionTotal = expenseData.reduce((sum, expense) => sum + expense.amount, 0)
    
    if (subscriptionTotal > 0) {
      const categoryValue = subscription.category?.value || 'other'
      if (!categoryMap.has(categoryValue)) {
        categoryMap.set(categoryValue, { amount: 0, subscriptions: new Set() })
      }

      const categoryData = categoryMap.get(categoryValue)!
      categoryData.amount += subscriptionTotal
      categoryData.subscriptions.add(subscription.id)
      totalAmount += subscriptionTotal
    }
  })
  
  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      subscriptionCount: data.subscriptions.size
    }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * Get date range presets for filtering
 */
export function getDateRangePresets(): Array<{ label: string; startDate: Date; endDate: Date }> {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  return [
    {
      label: 'Last 3 Months',
      startDate: new Date(currentYear, currentMonth - 2, 1),
      endDate: now
    },
    {
      label: 'Last 6 Months',
      startDate: new Date(currentYear, currentMonth - 5, 1),
      endDate: now
    },
    {
      label: 'Last 12 Months',
      startDate: new Date(currentYear, currentMonth - 11, 1),
      endDate: now // 修复：使用当前日期作为结束日期，确保包含当前月份
    },
    {
      label: 'This Year',
      startDate: new Date(currentYear, 0, 1),
      endDate: now
    },
    {
      label: 'Last Year',
      startDate: new Date(currentYear - 1, 0, 1),
      endDate: new Date(currentYear - 1, 11, 31)
    }
  ]
}
