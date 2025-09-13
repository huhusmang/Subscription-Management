import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/config/api';

export type ErrorHandler = (error: Error | ApiError) => void;

// Default error messages
const DEFAULT_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  401: 'Authentication required. Please login.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'Conflict with existing data.',
  422: 'Invalid data provided.',
  429: 'Too many requests. Please try again later.',
  500: 'Server error. Please try again later.',
  502: 'Service temporarily unavailable.',
  503: 'Service maintenance in progress.',
};

// Error handling utility
export const handleError = (error: Error | ApiError, customHandler?: ErrorHandler) => {
  console.error('Error occurred:', error);

  if (customHandler) {
    customHandler(error);
    return;
  }

  // Default handling
  if (error instanceof ApiError) {
    const message = error.message || DEFAULT_ERROR_MESSAGES[error.status || 500] || 'An unexpected error occurred';

    toast({
      title: 'Error',
      description: message,
      variant: 'destructive',
    });
  } else {
    toast({
      title: 'Error',
      description: error.message || 'An unexpected error occurred',
      variant: 'destructive',
    });
  }
};

// Async error wrapper
export const withErrorHandling = async <T,>(
  asyncFn: () => Promise<T>,
  customHandler?: ErrorHandler
): Promise<T | null> => {
  try {
    return await asyncFn();
  } catch (error) {
    handleError(error as Error, customHandler);
    return null;
  }
};

// Error message extraction
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
};

// Error type checking
export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError;
};

// Network error checking
export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof ApiError) {
    return error.status === undefined || error.status >= 500;
  }
  return false;
};

// Validation error checking
export const isValidationError = (error: unknown): boolean => {
  if (error instanceof ApiError) {
    return error.status === 400;
  }
  return false;
};
