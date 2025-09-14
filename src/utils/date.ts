import { format, isValid, startOfMonth, endOfMonth, startOfYear, endOfYear, getDaysInMonth, getDaysInYear, differenceInDays } from 'date-fns';

// Date formatting functions
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!isValid(dateObj)) return '';
    
    return format(dateObj, 'yyyy-MM-dd');
  } catch {
    return '';
  }
};

export const formatDateDisplay = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!isValid(dateObj)) return '';
    
    return format(dateObj, 'MMM d, yyyy');
  } catch {
    return '';
  }
};

export const formatDateWithTime = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!isValid(dateObj)) return '';
    
    return format(dateObj, 'yyyy-MM-dd HH:mm:ss');
  } catch {
    return '';
  }
};

// Date parsing functions
export const parseDate = (dateString: string): Date | null => {
  try {
    const date = new Date(dateString);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
};

// Date range functions
export const getMonthRange = (date: Date) => ({
  start: startOfMonth(date),
  end: endOfMonth(date)
});

export const getYearRange = (date: Date) => ({
  start: startOfYear(date),
  end: endOfYear(date)
});

// Period calculation functions
export const getDaysInPeriod = (period: 'monthly' | 'quarterly' | 'yearly' | 'semiannual', date: Date = new Date()): number => {
  switch (period) {
    case 'monthly':
      return getDaysInMonth(date);
    case 'quarterly':
      return 91; // Approximate
    case 'semiannual':
      return 182; // Approximate
    case 'yearly':
      return getDaysInYear(date);
    default:
      return 30;
  }
};

// Billing calculation functions
export const calculateNextBillingDate = (
  lastBillingDate: Date | string,
  billingCycle: 'monthly' | 'quarterly' | 'yearly' | 'semiannual'
): Date => {
  const date = typeof lastBillingDate === 'string' ? new Date(lastBillingDate) : lastBillingDate;
  
  switch (billingCycle) {
    case 'monthly':
      return new Date(date.getFullYear(), date.getMonth() + 1, date.getDate());
    case 'quarterly':
      return new Date(date.getFullYear(), date.getMonth() + 3, date.getDate());
    case 'semiannual':
      return new Date(date.getFullYear(), date.getMonth() + 6, date.getDate());
    case 'yearly':
      return new Date(date.getFullYear() + 1, date.getMonth(), date.getDate());
    default:
      return date;
  }
};

export const getDaysUntilDate = (targetDate: Date | string): number => {
  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  
  return differenceInDays(target, today);
};

// Date validation
export const isValidDate = (date: unknown): boolean => {
  if (!date) return false;
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return isValid(dateObj);
};

// Export all date-fns functions that might be needed
export { 
  format, 
  parse, 
  isValid, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear,
  getDaysInMonth,
  getDaysInYear,
  differenceInDays,
  addDays,
  addMonths,
  addYears,
  subDays,
  subMonths,
  subYears,
  isBefore,
  isAfter,
  isToday,
  isFuture,
  isPast
} from 'date-fns';