// Subscription related types
export interface Subscription {
  id: number;
  name: string;
  description?: string;
  category: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'quarterly' | 'yearly' | 'semiannual';
  status: 'active' | 'trial' | 'cancelled';
  nextBillingDate?: string;
  lastBillingDate?: string;
  createdAt: string;
  updatedAt: string;
  autoRenew: boolean;
  paymentMethod?: string;
  subscriptionPlan?: string;
  website?: string;
  notes?: string;
}

// Payment history types
export interface PaymentHistory {
  id: number;
  subscriptionId: number;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethod?: string;
  status: 'success' | 'failed' | 'pending';
  createdAt: string;
}

// Category and payment method types
export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
  type: string;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  description?: string;
}

// Analytics types
export interface CategoryExpense {
  category: string;
  amount: number;
  count: number;
}

export interface MonthlyExpense {
  month: string;
  amount: number;
  categories: CategoryExpense[];
}

export interface YearlyExpense {
  year: number;
  amount: number;
  months: MonthlyExpense[];
}

// Settings types
export interface Settings {
  currency: string;
  theme: 'light' | 'dark' | 'system';
  exchangeRates?: Record<string, number>;


}

// API request/response types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface FilterParams {
  status?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

// Date range types
export interface DateRange {
  start: Date;
  end: Date;
}

// Currency types
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CNY' | 'JPY' | 'KRW' | 'CAD' | 'AUD' | 'INR' | 'TRY' | 'HKD';

// Chart data types
export interface ChartDataPoint {
  name: string;
  value: number;
  fill?: string;
}

export interface TrendDataPoint {
  period: string;
  amount: number;
  [key: string]: unknown; // For category data
}