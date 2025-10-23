import { useState, useMemo, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSubscriptionStore } from "@/store/subscriptionStore"
import { useSettingsStore } from "@/store/settingsStore"
import {
  getApiMonthlyExpenses,
  getApiCategoryExpenses,
  getApiMonthlyCategoryExpenses,
  getApiYearlyCategoryExpenses,
  calculateYearlyExpensesFromMonthly,
  MonthlyExpense,
  YearlyExpense,
  CategoryExpense
} from "@/lib/expense-analytics-api"
import {
  convertMonthlyExpensesToInfo,
  calculateQuarterlyExpenses,
  calculateYearlyExpenses,
  filterRecentExpenses
} from "@/lib/expense-info-analytics"
import { ExpenseInfoData } from "@/components/charts/ExpenseInfoCards"
import { ExpenseTrendChart } from "@/components/charts/ExpenseTrendChart"
import { YearlyTrendChart } from "@/components/charts/YearlyTrendChart"
import { CategoryPieChart } from "@/components/charts/CategoryPieChart"
import { ExpenseInfoCards } from "@/components/charts/ExpenseInfoCards"
import { apiClient } from '@/utils/api-client'
import type { PaymentRecordApi } from '@/utils/dataTransform'


import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


export function ExpenseReportsPage() {
  const ensureSubscriptions = useSubscriptionStore((state) => state.ensureInitialized)
  const { t } = useTranslation(['reports', 'common'])
  const userCurrency = useSettingsStore((state) => state.currency)
  const ensureSettings = useSettingsStore((state) => state.ensureSettings)
  
  // Filter states
  const [selectedDateRange] = useState('Last 12 Months')
  const [selectedYearlyDateRange] = useState(() => {
    const currentYear = new Date().getFullYear()
    return `${currentYear - 2} - ${currentYear}`
  })

  // Fetch data when component mounts
  const initializeData = useCallback(async () => {
    await Promise.all([
      ensureSubscriptions(),
      ensureSettings()
    ])
  }, [ensureSettings, ensureSubscriptions])

  useEffect(() => {
    initializeData()
  }, [initializeData])

  // Get date range presets - create stable date range
  const currentDateRange = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    const presets = {
      'Last 3 Months': {
        startDate: new Date(currentYear, currentMonth - 2, 1),
        endDate: now
      },
      'Last 6 Months': {
        startDate: new Date(currentYear, currentMonth - 5, 1),
        endDate: now
      },
      'Last 12 Months': {
        startDate: new Date(currentYear, currentMonth - 11, 1),
        endDate: now
      },
      'This Year': {
        startDate: new Date(currentYear, 0, 1),
        endDate: now
      },
      'Last Year': {
        startDate: new Date(currentYear - 1, 0, 1),
        endDate: new Date(currentYear - 1, 11, 31)
      }
    }

    return presets[selectedDateRange as keyof typeof presets] || presets['Last 12 Months']
  }, [selectedDateRange])

  // Get yearly date range presets (fixed recent 3 years)
  const yearlyDateRangePresets = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() // 0-11
    return [
      {
        label: `${currentYear - 2} - ${currentYear}`,
        startDate: new Date(currentYear - 2, 0, 1), // January 1st of 3 years ago
        endDate: new Date(currentYear, currentMonth, new Date(currentYear, currentMonth + 1, 0).getDate()) // Last day of current month
      }
    ]
  }, [])

  const currentYearlyDateRange = useMemo(() => {
    return yearlyDateRangePresets.find(preset => preset.label === selectedYearlyDateRange)
      || yearlyDateRangePresets[0] // Default to Recent 3 Years
  }, [selectedYearlyDateRange, yearlyDateRangePresets])
  
  // State for API data
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpense[]>([])
  const [yearlyExpenses, setYearlyExpenses] = useState<YearlyExpense[]>([])
  const [categoryExpenses, setCategoryExpenses] = useState<CategoryExpense[]>([])
  const [yearlyCategoryExpenses, setYearlyCategoryExpenses] = useState<CategoryExpense[]>([])
  const [monthlyCategoryExpenses, setMonthlyCategoryExpenses] = useState<{ month: string; monthKey: string; year: number; categories: { [categoryName: string]: number }; total: number }[]>([])
  const [yearlyGroupedCategoryExpenses, setYearlyGroupedCategoryExpenses] = useState<{ year: number; categories: { [categoryName: string]: number }; total: number }[]>([])

  // State for expense info data
  const [expenseInfoData, setExpenseInfoData] = useState<{
    monthly: ExpenseInfoData[]
    quarterly: ExpenseInfoData[]
    yearly: ExpenseInfoData[]
  }>({
    monthly: [],
    quarterly: [],
    yearly: []
  })

  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false)
  const [isLoadingYearlyExpenses, setIsLoadingYearlyExpenses] = useState(false)
  const [isLoadingCategoryExpenses, setIsLoadingCategoryExpenses] = useState(false)
  const [isLoadingYearlyCategoryExpenses, setIsLoadingYearlyCategoryExpenses] = useState(false)
  const [, setIsLoadingMonthlyCategoryExpenses] = useState(false)
  const [, setIsLoadingYearlyGroupedCategoryExpenses] = useState(false)

  const [isLoadingExpenseInfo, setIsLoadingExpenseInfo] = useState(false)
  const [expenseError, setExpenseError] = useState<string | null>(null)
  const [yearlyExpenseError, setYearlyExpenseError] = useState<string | null>(null)
  const [categoryExpenseError, setCategoryExpenseError] = useState<string | null>(null)
  const [yearlyCategoryExpenseError, setYearlyCategoryExpenseError] = useState<string | null>(null)
  const [, setMonthlyCategoryExpenseError] = useState<string | null>(null)
  const [, setYearlyGroupedCategoryExpenseError] = useState<string | null>(null)

  const [expenseInfoError, setExpenseInfoError] = useState<string | null>(null)



  // Load expense info data (recent periods)
  useEffect(() => {
    const loadExpenseInfoData = async () => {
      setIsLoadingExpenseInfo(true)
      setExpenseInfoError(null)

      try {
        // Get recent 12 months of data for expense info
        const endDate = new Date()
        const startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 12)

        const allMonthlyData = await getApiMonthlyExpenses(startDate, endDate, userCurrency)

        // Process API data
        if (allMonthlyData && allMonthlyData.length > 0) {
          const { monthlyExpenses: recentMonthly, quarterlyExpenses: recentQuarterly, yearlyExpenses: recentYearly } = filterRecentExpenses(allMonthlyData)

          // Convert to expense info format
          const monthlyInfo = convertMonthlyExpensesToInfo(recentMonthly, userCurrency)
          const quarterlyInfo = calculateQuarterlyExpenses(recentQuarterly, userCurrency)
          const yearlyInfo = calculateYearlyExpenses(recentYearly, userCurrency)

          // Ensure paymentCount matches real payment-history records
          const fillAccurateCounts = async (list: ExpenseInfoData[]): Promise<ExpenseInfoData[]> => {
            const updated = await Promise.all(
              list.map(async (item) => {
                try {
                  const records = await apiClient.get<PaymentRecordApi[]>(
                    `/payment-history?start_date=${item.startDate}&end_date=${item.endDate}&status=succeeded`
                  )
                  return { ...item, paymentCount: records.length }
                } catch {
                  return item
                }
              })
            )
            return updated
          }

          const [monthlyFixed, quarterlyFixed, yearlyFixed] = await Promise.all([
            fillAccurateCounts(monthlyInfo),
            fillAccurateCounts(quarterlyInfo),
            fillAccurateCounts(yearlyInfo)
          ])

          setExpenseInfoData({
            monthly: monthlyFixed,
            quarterly: quarterlyFixed,
            yearly: yearlyFixed
          })
        } else {
          // No data available, set empty state
          setExpenseInfoData({
            monthly: [],
            quarterly: [],
            yearly: []
          })
        }

      } catch (error) {
        console.error('Failed to load expense info data:', error)
        setExpenseInfoError(error instanceof Error ? error.message : 'Failed to load expense info data')

        // Set empty state on error
        setExpenseInfoData({
          monthly: [],
          quarterly: [],
          yearly: []
        })
      } finally {
        setIsLoadingExpenseInfo(false)
      }
    }

    loadExpenseInfoData()
  }, [userCurrency])

  // Load monthly expense data from API
  useEffect(() => {
    const loadMonthlyExpenseData = async () => {
      setIsLoadingExpenses(true)
      setExpenseError(null)

      try {
        // Fetch monthly expenses from API
        const monthlyData = await getApiMonthlyExpenses(currentDateRange.startDate, currentDateRange.endDate, userCurrency);
        setMonthlyExpenses(monthlyData)

      } catch (error) {
        console.error('Failed to load monthly expense data:', error)
        setExpenseError(error instanceof Error ? error.message : 'Failed to load monthly expense data')
      } finally {
        setIsLoadingExpenses(false)
      }
    }

    const loadMonthlyCategoryExpenseData = async () => {
      setIsLoadingMonthlyCategoryExpenses(true)
      setMonthlyCategoryExpenseError(null)

      try {
        // Fetch monthly category expenses from API
        const monthlyCategoryData = await getApiMonthlyCategoryExpenses(currentDateRange.startDate, currentDateRange.endDate, userCurrency);
        setMonthlyCategoryExpenses(monthlyCategoryData)

      } catch (error) {
        console.error('Failed to load monthly category expense data:', error)
        setMonthlyCategoryExpenseError(error instanceof Error ? error.message : 'Failed to load monthly category expense data')
      } finally {
        setIsLoadingMonthlyCategoryExpenses(false)
      }
    }

    loadMonthlyExpenseData()
    loadMonthlyCategoryExpenseData()
  }, [currentDateRange, userCurrency])

  // Load category expense data from API
  useEffect(() => {
    const loadCategoryExpenseData = async () => {
      setIsLoadingCategoryExpenses(true)
      setCategoryExpenseError(null)

      try {
        // Fetch category expenses from API
        const categoryData = await getApiCategoryExpenses(currentDateRange.startDate, currentDateRange.endDate, userCurrency);
        setCategoryExpenses(categoryData)

      } catch (error) {
        console.error('Failed to load category expense data:', error)
        setCategoryExpenseError(error instanceof Error ? error.message : 'Failed to load category expense data')
      } finally {
        setIsLoadingCategoryExpenses(false)
      }
    }

    loadCategoryExpenseData()
  }, [currentDateRange, userCurrency])

  // Load yearly expense data from API (using separate date range)
  useEffect(() => {
    const loadYearlyExpenseData = async () => {
      setIsLoadingYearlyExpenses(true)
      setYearlyExpenseError(null)

      try {
        // Fetch yearly expenses using the 3-year date range
        const yearlyMonthlyData = await getApiMonthlyExpenses(
          currentYearlyDateRange.startDate,
          currentYearlyDateRange.endDate,
          userCurrency
        );

        // Calculate yearly expenses from monthly data
        const yearlyData = calculateYearlyExpensesFromMonthly(yearlyMonthlyData)
        setYearlyExpenses(yearlyData)



      } catch (error) {
        console.error('Failed to load yearly expense data:', error)
        setYearlyExpenseError(error instanceof Error ? error.message : 'Failed to load yearly expense data')
      } finally {
        setIsLoadingYearlyExpenses(false)
      }
    }

    loadYearlyExpenseData()
  }, [currentYearlyDateRange, userCurrency])

  // Load yearly category expense data from API
  useEffect(() => {
    const loadYearlyCategoryExpenseData = async () => {
      setIsLoadingYearlyCategoryExpenses(true)
      setYearlyCategoryExpenseError(null)

      try {
        // Fetch yearly category expenses from API using yearly date range
        const yearlyCategoryData = await getApiCategoryExpenses(
          currentYearlyDateRange.startDate,
          currentYearlyDateRange.endDate,
          userCurrency
        );
        setYearlyCategoryExpenses(yearlyCategoryData)

      } catch (error) {
        console.error('Failed to load yearly category expense data:', error)
        setYearlyCategoryExpenseError(error instanceof Error ? error.message : 'Failed to load yearly category expense data')
      } finally {
        setIsLoadingYearlyCategoryExpenses(false)
      }
    }

    const loadYearlyGroupedCategoryExpenseData = async () => {
      setIsLoadingYearlyGroupedCategoryExpenses(true)
      setYearlyGroupedCategoryExpenseError(null)

      try {
        // Fetch yearly grouped category expenses from API
        const yearlyGroupedCategoryData = await getApiYearlyCategoryExpenses(
          currentYearlyDateRange.startDate,
          currentYearlyDateRange.endDate,
          userCurrency
        );
        setYearlyGroupedCategoryExpenses(yearlyGroupedCategoryData)

      } catch (error) {
        console.error('Failed to load yearly grouped category expense data:', error)
        setYearlyGroupedCategoryExpenseError(error instanceof Error ? error.message : 'Failed to load yearly grouped category expense data')
      } finally {
        setIsLoadingYearlyGroupedCategoryExpenses(false)
      }
    }

    loadYearlyCategoryExpenseData()
    loadYearlyGroupedCategoryExpenseData()
  }, [currentYearlyDateRange, userCurrency])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('description')}
          </p>
        </div>
      </div>

      {/* Expense Info Cards */}
      <div className="space-y-6">
        <div>
          {isLoadingExpenseInfo ? (
            <div>
              <p className="text-sm text-muted-foreground mb-4">{t('loadingExpenseOverview')}</p>
              <ExpenseInfoCards
                monthlyData={[]}
                quarterlyData={[]}
                yearlyData={[]}
                currency={userCurrency}
                isLoading={true}
              />
            </div>
          ) : expenseInfoError ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center">
                  <p className="text-sm text-destructive mb-2">{t('failedToLoadExpenseOverview')}</p>
                  <p className="text-xs text-muted-foreground">{expenseInfoError}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div>
              <ExpenseInfoCards
                monthlyData={expenseInfoData.monthly}
                quarterlyData={expenseInfoData.quarterly}
                yearlyData={expenseInfoData.yearly}
                currency={userCurrency}
              />
            </div>
          )}
        </div>
      </div>



      {/* Loading and Error States */}
      {isLoadingExpenses && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">{t('loadingExpenseData')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {expenseError && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <p className="text-sm text-destructive mb-2">{t('failedToLoadExpenseData')}</p>
              <p className="text-xs text-muted-foreground">{expenseError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      {!isLoadingExpenses && !expenseError && (
        <div className="space-y-4">
          <Tabs defaultValue="monthly" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly">{t('monthly')}</TabsTrigger>
              <TabsTrigger value="yearly">{t('yearly')}</TabsTrigger>
            </TabsList>

            <TabsContent value="monthly" className="space-y-4">
              <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
                <ExpenseTrendChart
                  data={monthlyExpenses}
                  categoryData={monthlyCategoryExpenses}
                  currency={userCurrency}
                />
                {isLoadingCategoryExpenses ? (
                  <Card>
                    <CardContent className="flex items-center justify-center h-[400px]">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">{t('loadingCategoryData')}</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : categoryExpenseError ? (
                  <Card>
                    <CardContent className="flex items-center justify-center h-[400px]">
                      <div className="text-center text-destructive">
                        <p className="font-medium">{t('failedToLoadCategoryData')}</p>
                        <p className="text-sm text-muted-foreground mt-1">{categoryExpenseError}</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <CategoryPieChart
                    data={categoryExpenses}
                    currency={userCurrency}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="yearly" className="space-y-4">
              {isLoadingYearlyExpenses ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">{t('loadingYearlyData')}</p>
                  </div>
                </div>
              ) : yearlyExpenseError ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <p className="text-sm text-destructive mb-2">{t('failedToLoadYearlyData')}</p>
                    <p className="text-xs text-muted-foreground">{yearlyExpenseError}</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
                  <YearlyTrendChart
                    data={yearlyExpenses}
                    categoryData={yearlyGroupedCategoryExpenses}
                    currency={userCurrency}
                  />
                  {isLoadingYearlyCategoryExpenses ? (
                    <Card>
                      <CardContent className="flex items-center justify-center h-[400px]">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                          <p className="text-sm text-muted-foreground">{t('loadingYearlyCategoryData')}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : yearlyCategoryExpenseError ? (
                    <Card>
                      <CardContent className="flex items-center justify-center h-[400px]">
                        <div className="text-center text-destructive">
                          <p className="font-medium">{t('failedToLoadYearlyCategoryData')}</p>
                          <p className="text-sm text-muted-foreground mt-1">{yearlyCategoryExpenseError}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <CategoryPieChart
                      data={yearlyCategoryExpenses}
                      currency={userCurrency}
                    />
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
