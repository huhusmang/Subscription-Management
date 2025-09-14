import { logger } from '@/utils/logger';
import { getBaseCurrency } from '@/config/currency';
import { apiClient } from '@/utils/api-client';

export interface ExchangeRate {
  id: number;
  from_currency: string;
  to_currency: string;
  rate: number;
  created_at: string;
  updated_at: string;
}

export interface ExchangeRateStatus {
  isRunning: boolean;
  nextRun: string | null;
  hasApiKey: boolean;
}

export interface ExchangeRateConfigStatus {
  tianApiConfigured: boolean;
  provider: string;
  updateFrequency: string;
  baseCurrency?: string;
}

/**
 * 汇率 API 服务
 */
export class ExchangeRateApi {
  /**
   * 获取所有汇率
   */
  static async getAllRates(): Promise<ExchangeRate[]> {
    try {
      return await apiClient.get<ExchangeRate[]>('/exchange-rates');
    } catch (error) {
      logger.error('Error fetching exchange rates:', error);
      throw error;
    }
  }

  /**
   * 获取特定汇率
   */
  static async getRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate> {
    try {
      return await apiClient.get<ExchangeRate>(`/exchange-rates/${fromCurrency}/${toCurrency}`);
    } catch (error) {
      logger.error(`Error fetching exchange rate ${fromCurrency}->${toCurrency}:`, error);
      throw error;
    }
  }

  /**
   * 手动触发汇率更新
   */
  static async updateRates(): Promise<{ message: string; updatedAt: string }> {
    try {
      return await apiClient.post<{ message: string; updatedAt: string }>('/protected/exchange-rates/update');
    } catch (error) {
      logger.error('Error updating exchange rates:', error);
      throw error;
    }
  }

  /**
   * 获取汇率调度器状态
   */
  static async getSchedulerStatus(): Promise<ExchangeRateStatus> {
    try {
      return await apiClient.get<ExchangeRateStatus>('/exchange-rates/status');
    } catch (error) {
      logger.error('Error fetching scheduler status:', error);
      throw error;
    }
  }

  /**
   * 获取汇率配置状态
   */
  static async getConfigStatus(): Promise<ExchangeRateConfigStatus> {
    try {
      return await apiClient.get<ExchangeRateConfigStatus>('/exchange-rates/config-status');
    } catch (error) {
      logger.error('Error fetching config status:', error);
      throw error;
    }
  }

  /**
   * 将汇率数组转换为汇率映射对象
   */
  static ratesToMap(rates: ExchangeRate[]): Record<string, number> {
    const rateMap: Record<string, number> = {};

    if (!rates || rates.length === 0) {
      // Fallback to frontend base currency with self rate
      rateMap[getBaseCurrency()] = 1;
      return rateMap;
    }

    // Prefer the entry that represents base -> base with rate 1
    const selfRate = rates.find(r => r.from_currency === r.to_currency && Math.abs(r.rate - 1) < 1e-9);
    let serverBase = selfRate?.from_currency;

    // If not present, infer the most common from_currency; fallback to first
    if (!serverBase) {
      const countMap = new Map<string, number>();
      for (const r of rates) {
        countMap.set(r.from_currency, (countMap.get(r.from_currency) || 0) + 1);
      }
      serverBase = Array.from(countMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || rates[0].from_currency;
    }

    // Build mapping from the server-declared base currency
    for (const rate of rates) {
      if (rate.from_currency === serverBase) {
        rateMap[rate.to_currency] = rate.rate;
      }
    }

    // Ensure base currency self rate exists
    rateMap[serverBase] = 1;

    return rateMap;
  }
}
