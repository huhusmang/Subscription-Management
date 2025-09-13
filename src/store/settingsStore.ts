import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ExchangeRateApi, type ExchangeRateConfigStatus } from '@/services/exchangeRateApi'
import { logger } from '@/utils/logger'
import { BASE_CURRENCY, DEFAULT_EXCHANGE_RATES, type CurrencyType, SUPPORTED_CURRENCIES } from '@/config/currency'
import { apiClient } from '@/utils/api-client'

// Helper function to validate currency type
const validateCurrency = (currency: string | undefined): CurrencyType => {
  if (currency && SUPPORTED_CURRENCIES.includes(currency as CurrencyType)) {
    return currency as CurrencyType
  }
  return BASE_CURRENCY // default fallback
}

// Helper function to validate theme type
const validateTheme = (theme: string | undefined): ThemeType => {
  if (theme === 'light' || theme === 'dark' || theme === 'system') {
    return theme as ThemeType
  }
  return 'system' // default fallback
}

interface SettingsApiResponse {
  currency?: string
  theme?: string
  show_original_currency?: boolean
  exchange_rates?: Record<string, number>
  [key: string]: unknown
}

export type ThemeType = 'light' | 'dark' | 'system'

interface SettingsState {
  // --- Synced with Backend ---
  currency: CurrencyType
  setCurrency: (currency: CurrencyType) => Promise<void>
  theme: ThemeType
  setTheme: (theme: ThemeType) => Promise<void>
  
  // Currency display settings
  showOriginalCurrency: boolean
  setShowOriginalCurrency: (show: boolean) => void
  
  // Exchange rate settings
  exchangeRates: Record<string, number>
  updateExchangeRate: (currency: string, rate: number) => void
  lastExchangeRateUpdate: string | null
  updateLastExchangeRateUpdate: () => void
  fetchExchangeRates: () => Promise<void>
  updateExchangeRatesFromApi: () => Promise<void>
  
  // Exchange rate configuration status
  exchangeRateConfigStatus: ExchangeRateConfigStatus | null
  fetchExchangeRateConfigStatus: () => Promise<void>
  
  // Data management
  resetSettings: () => void
  fetchSettings: () => Promise<void>
  isLoading: boolean
  error: string | null
}

export const initialSettings = {
  // Synced
  currency: BASE_CURRENCY,
  theme: 'system' as ThemeType,
  showOriginalCurrency: true,

  exchangeRates: DEFAULT_EXCHANGE_RATES,
  lastExchangeRateUpdate: null,
  exchangeRateConfigStatus: null,
  isLoading: false,
  error: null
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...initialSettings,
      
      fetchSettings: async () => {
        set({ isLoading: true, error: null })
        try {
          const loadedSettings = await apiClient.get<SettingsApiResponse>('/settings')
          const settings = {
            currency: validateCurrency(loadedSettings.currency),
            theme: validateTheme(loadedSettings.theme),
            showOriginalCurrency: loadedSettings.show_original_currency !== undefined
              ? Boolean(loadedSettings.show_original_currency)
              : initialSettings.showOriginalCurrency,
          }

          set({ ...settings, isLoading: false })
          // Don't apply theme here - let next-themes handle it

          // 获取汇率数据和配置状态
          get().fetchExchangeRates()
          get().fetchExchangeRateConfigStatus()

        } catch (error: unknown) {
          // If settings don't exist, the backend might 404, which is okay.
          const errorObj = error as { status?: number; message?: string }
          if (errorObj.status === 404) {
            logger.warn('Settings not found on backend. Using local/default settings.')
            set({ isLoading: false })
            return
          }
          logger.error('Error fetching settings:', error)
          const errorMessage = errorObj.message || 'Unknown error occurred'
          set({ error: errorMessage, isLoading: false })
        }
      },
      
      setCurrency: async (currency) => {
        set({ currency })
        
        // Sync to backend
        try {
          await apiClient.put('/protected/settings', { currency })
        } catch (error: unknown) {
          logger.error('Error saving currency setting:', error)
          // Could optionally revert the local change here
        }
      },
      
      setTheme: async (theme) => {
        set({ theme })
        // Don't apply theme here - let next-themes handle it
        // localStorage is also handled by next-themes

        // Sync to backend
        try {
          await apiClient.put('/protected/settings', { theme })
        } catch (error: unknown) {
          logger.error('Error saving theme setting:', error)
        }
      },


      setShowOriginalCurrency: async (showOriginalCurrency) => {
        set({ showOriginalCurrency })

        // Sync to backend
        try {
          await apiClient.put('/protected/settings', { showOriginalCurrency })
        } catch (error: unknown) {
          logger.error('Error saving showOriginalCurrency setting:', error)
          // Could optionally revert the local change here
        }
      },

      
      updateExchangeRate: (currency, rate) => set((state) => ({
        exchangeRates: { ...state.exchangeRates, [currency]: rate }
      })),
      
      updateLastExchangeRateUpdate: () => set({
        lastExchangeRateUpdate: new Date().toISOString()
      }),

      fetchExchangeRates: async () => {
        try {
          const rates = await ExchangeRateApi.getAllRates();
          const rateMap = ExchangeRateApi.ratesToMap(rates);

          set({
            exchangeRates: rateMap,
            lastExchangeRateUpdate: new Date().toISOString()
          });
        } catch (error: unknown) {
          logger.error('Error fetching exchange rates:', error);
          // 保持现有汇率，不更新错误状态，因为这可能在后台运行
        }
      },

      updateExchangeRatesFromApi: async () => {
        try {
          await ExchangeRateApi.updateRates();
          // 更新成功后重新获取汇率
          await get().fetchExchangeRates();
        } catch (error: unknown) {
          logger.error('Error updating exchange rates:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
          set({ error: errorMessage });
          throw error;
        }
      },

      fetchExchangeRateConfigStatus: async () => {
        try {
          const configStatus = await ExchangeRateApi.getConfigStatus();
          set({ exchangeRateConfigStatus: configStatus });
        } catch (error: unknown) {
          logger.error('Error fetching exchange rate config status:', error);
          // 不设置错误状态，因为这不是关键功能
        }
      },
      
      resetSettings: async () => {
        try {
          await apiClient.post('/protected/settings/reset')

          // Reset local state to initial settings
          set({ ...initialSettings })
          // Don't apply theme here - let next-themes handle it

          return { error: null }
        } catch (error: unknown) {
          logger.error('Error resetting settings:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
          set({ error: errorMessage })
          return { error }
        }
      },
    }),
    {
      name: 'settings-storage',
      // Persist all settings except for loading/error states.
      partialize: (state) => {
        const { ...rest } = state;
        // Functions are not persisted, so we don't need to omit them.
        return rest;
      }
    }
  )
)