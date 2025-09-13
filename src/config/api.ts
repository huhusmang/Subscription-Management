// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

// API Headers
export const getHeaders = (method: string = 'GET'): HeadersInit => {
  const headers: HeadersInit = {};
  
  if (method !== 'GET') {
    headers['Content-Type'] = 'application/json';
  }
  // Session-based auth via cookies; no API key header needed
  return headers;
};

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: string[];
}

// API Error Class
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}