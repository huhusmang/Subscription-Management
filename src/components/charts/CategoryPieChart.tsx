import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartConfig } from "@/components/ui/chart"
import { formatCurrencyAmount } from "@/utils/currency"
import { CategoryExpense } from "@/lib/expense-analytics-api"
import { useSubscriptionStore } from "@/store/subscriptionStore"
import { memo } from "react"
import { useTranslation } from "react-i18next"

interface CategoryPieChartProps {
  data: CategoryExpense[]
  currency: string
  className?: string
}

// Define colors for different categories - using CSS variables for theme support
const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  // Fallback colors that work in both light and dark modes
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

const arePropsEqual = (
  prev: CategoryPieChartProps,
  next: CategoryPieChartProps
) => {
  return (
    prev.currency === next.currency &&
    prev.className === next.className &&
    prev.data === next.data
  )
}

function CategoryPieChartComponent({ data, currency, className }: CategoryPieChartProps) {
  const { t } = useTranslation('reports')
  const categories = useSubscriptionStore((state) => state.categories)
  
  // Get category label
  const getCategoryLabel = (categoryValue: string) => {
    const category = categories.find(c => c.value === categoryValue)
    return category?.label || categoryValue
  }
  
  // Prepare chart data with colors
  const chartData = data.map((item, index) => ({
    ...item,
    label: getCategoryLabel(item.category),
    color: COLORS[index % COLORS.length]
  }))
  
  const chartConfig = chartData.reduce((config, item, index) => {
    config[item.category] = {
      label: item.label,
      color: COLORS[index % COLORS.length],
    }
    return config
  }, {} as ChartConfig)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">{t('chart.spendingByCategory')}</CardTitle>
        <CardDescription>{t('chart.breakdownByCategory')}</CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] sm:h-[250px] lg:h-[300px] text-muted-foreground">
            {t('chart.noCategoryDataAvailable')}
          </div>
        ) : (
          <>
            {/* Chart */}
            <div className="flex items-center justify-center min-h-[240px] sm:min-h-[280px] w-full">
              <ChartContainer config={chartConfig} className="h-[240px] sm:h-[280px] w-full max-w-[400px] mx-auto overflow-hidden">
                <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percentage }) => `${percentage.toFixed(1)}%`}
                      outerRadius="80%"
                      innerRadius={0}
                      fill="hsl(var(--chart-1))"
                      dataKey="amount"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as CategoryExpense & { label: string }
                          return (
                            <div className="rounded-lg border bg-background p-3 shadow-md">
                              <div className="grid gap-2">
                                <div className="font-medium">{data.label}</div>
                                <div className="grid gap-1 text-sm">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-muted-foreground">{t('chart.amount')}:</span>
                                    <span className="font-medium">
                                      {formatCurrencyAmount(data.amount, currency)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-muted-foreground">{t('chart.percentage')}:</span>
                                    <span className="font-medium">{data.percentage.toFixed(1)}%</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                </PieChart>
              </ChartContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 justify-center mt-4 pt-4 border-t">
              {chartData.map((item) => (
                <div key={item.category} className="flex items-center gap-2 text-sm">
                  <div
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export const CategoryPieChart = memo(CategoryPieChartComponent, arePropsEqual)
