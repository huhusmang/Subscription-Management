import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { type CurrencyType, isBaseCurrency } from '@/config/currency';
import { formatCurrencyAmount } from '@/utils/currency';
import { logger } from '@/utils/logger';
import { CURRENCY_NAMES } from '@/config/constants';

export function ExchangeRateManager() {
  const { t } = useTranslation('settings');
  const {
    exchangeRates,
    lastExchangeRateUpdate,
    exchangeRateConfigStatus,
    fetchExchangeRates,
    updateExchangeRatesFromApi,
    currency,
    setCurrency,
    showOriginalCurrency,
    setShowOriginalCurrency
  } = useSettingsStore();
  
  const [isUpdating, setIsUpdating] = useState(false);

  // 手动更新汇率
  const handleUpdateRates = async () => {
    setIsUpdating(true);
    try {
      await updateExchangeRatesFromApi();
    } catch (error) {
      logger.error('Failed to update exchange rates:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatLastUpdate = (dateString: string | null) => {
    if (!dateString) return 'Never';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return t('justNow');
    }
  };

  return (
    <div className="space-y-4">
      {/* 上排：货币设置和状态卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>{t('currencySettings')}</CardTitle>
            <CardDescription>
              {t('setPreferredCurrency')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex-1">
            <div>
              <Label htmlFor="currency">{t('defaultCurrency')}</Label>
              <Select
                value={currency}
                onValueChange={async (value: CurrencyType) => await setCurrency(value)}
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder={t('selectCurrency')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CNY">CNY - {t('chineseYuan')}</SelectItem>
                  <SelectItem value="USD">USD - {t('usDollar')}</SelectItem>
                  <SelectItem value="EUR">EUR - {t('euro')}</SelectItem>
                  <SelectItem value="GBP">GBP - {t('britishPound')}</SelectItem>
                  <SelectItem value="CAD">CAD - {t('canadianDollar')}</SelectItem>
                  <SelectItem value="AUD">AUD - {t('australianDollar')}</SelectItem>
                  <SelectItem value="JPY">JPY - {t('japaneseYen')}</SelectItem>
                  <SelectItem value="TRY">TRY - {t('turkishLira')}</SelectItem>
                  <SelectItem value="HKD">HKD - {t('hongKongDollar')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                {t('preferredCurrencyDesc')}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">{t('showInOriginalCurrency')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('showOriginalCurrencyDesc')}
                </p>
              </div>
              <Switch
                id="show-original"
                checked={showOriginalCurrency}
                onCheckedChange={setShowOriginalCurrency}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('exchangeRateStatus')}
            </CardTitle>
            <CardDescription>
              {t('automaticExchangeRateUpdates')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            <div className="space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t('apiProvider')}</p>
                  <p className="text-sm text-muted-foreground">tianapi.com</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">{t('apiConfiguration')}</p>
                  <div className="flex items-center gap-2">
                    {exchangeRateConfigStatus?.tianApiConfigured ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">{t('configured')}</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-600">{t('notConfigured')}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t('updateFrequency')}</p>
                  <p className="text-sm text-muted-foreground">{t('dailyAutomatic')}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">{t('lastSuccessfulUpdate')}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatLastUpdate(lastExchangeRateUpdate)}
                  </p>
                </div>
              </div>



              {!exchangeRateConfigStatus?.tianApiConfigured && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    {t('notConfigured')}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleUpdateRates}
                disabled={isUpdating || !exchangeRateConfigStatus?.tianApiConfigured}
                size="sm"
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {t('updateNow')}
              </Button>

              <Button
                onClick={fetchExchangeRates}
                variant="outline"
                size="sm"
                disabled={isUpdating}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('refreshRates')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 汇率列表 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('currentExchangeRates')}</CardTitle>
          <CardDescription>
            {t('allRatesRelativeTo', { currency })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(exchangeRates).map(([currency, rate]) => (
              <div
                key={currency}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="space-y-1">
                  <p className="font-medium">{currency}</p>
                  <p className="text-xs text-muted-foreground">
                    {CURRENCY_NAMES[currency as keyof typeof CURRENCY_NAMES] || currency}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrencyAmount(rate, currency, false)}
                  </p>
                </div>
                {isBaseCurrency(currency) && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
            ))}
          </div>

          {Object.keys(exchangeRates).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('noExchangeRatesAvailable')}</p>
              <Button
                onClick={fetchExchangeRates}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                {t('loadRates')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
