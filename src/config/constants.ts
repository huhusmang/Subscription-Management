import { CurrencyCode } from '@/types';

// Currency configuration
export const CURRENCY_NAMES: Record<CurrencyCode, string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  CNY: 'Chinese Yuan',
  JPY: 'Japanese Yen',
  KRW: 'South Korean Won',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
  INR: 'Indian Rupee',
  TRY: 'Turkish Lira',
  HKD: 'Hong Kong Dollar',
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CNY: '¥',
  JPY: '¥',
  KRW: '₩',
  CAD: 'C$',
  AUD: 'A$',
  INR: '₹',
  TRY: '₺',
  HKD: 'HK$',
};

// Chart colors
export const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-6))',
  'hsl(var(--chart-7))',
  'hsl(var(--chart-8))',
  'hsl(var(--chart-9))',
  'hsl(var(--chart-10))',
];

// Default values
export const DEFAULT_CURRENCY: CurrencyCode = 'USD';
export const DEFAULT_REMINDER_DAYS = 7;
export const DEFAULT_PAGE_SIZE = 20;

// Status options
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  TRIAL: 'trial',
  CANCELLED: 'cancelled',
} as const;

export const PAYMENT_STATUS = {
  SUCCESS: 'success',
  FAILED: 'failed',
  PENDING: 'pending',
} as const;

// Billing cycles
export const BILLING_CYCLES = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  SEMIANNUAL: 'semiannual',
  YEARLY: 'yearly',
} as const;

// View modes
export const VIEW_MODES = {
  GRID: 'grid',
  LIST: 'list',
} as const;