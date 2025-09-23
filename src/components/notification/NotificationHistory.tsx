import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2,
  RefreshCw,
  History,
  BarChart3,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { notificationApi, NotificationHistory as NotificationHistoryType, NotificationStats } from '@/services/notificationApi';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/utils/date';


// Helper function to parse and format message content (supports zh-CN and en templates)
const parseMessageContent = (content: string, t: (key: string, options?: Record<string, unknown>) => string) => {
  if (!content) return { summary: '', details: [] };

  // Remove HTML tags but preserve line breaks
  let text = content.replace(/<br\s*\/?>(?=\n)?/gi, '\n');
  text = text.replace(/<[^>]*>/g, '');
  // Normalize whitespace but KEEP newlines
  text = text
    .replace(/\r/g, '')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();

  // Extract key information
  const titleMatch = text.match(/(续订提醒|续订成功|续订失败|订阅变更|过期警告|Renewal Reminder|Subscription Expiration Warning|Renewal Successful|Renewal Failed|Subscription Change)/i);
  const title = titleMatch ? titleMatch[1] : t('history.defaultNotification');

  // Try multiple patterns to extract subscription name
  let subscriptionName = '';

  // Pattern 1: after 📢 emoji
  const nameMatch1 = text.match(/📢\s+([^\s]+)\s+(?:即将到期|续订|信息已更新|已过期|is about to expire|has expired|has been successfully renewed|renewal failed|information has been updated)/i);
  if (nameMatch1) {
    subscriptionName = nameMatch1[1];
  } else {
    // Pattern 2: generic before action words
    const nameMatch2 = text.match(/([a-zA-Z0-9_.-]+)\s+(?:即将到期|续订成功|续订失败|信息已更新|已过期|is about to expire|has expired|has been successfully renewed|renewal failed|information has been updated)/i);
    if (nameMatch2) subscriptionName = nameMatch2[1];
  }

  // Amount
  const amountMatch = text.match(/(?:金额|Amount)[：:\s]*([0-9.]+\s*[A-Z]{3})/i);
  const amount = amountMatch ? amountMatch[1] : '';

  // Date (accept yyyy-mm-dd or yyyy/mm/dd)
  const dateMatch = text.match(/(?:到期日期|到期时间|过期时间|Expiration date|Next payment|Scheduled renewal date)[：:\s]*(\d{4}[/-]\d{1,2}[/-]\d{1,2})/i);
  const date = dateMatch ? dateMatch[1] : '';

  // Payment method
  const paymentMatch = text.match(/(?:支付方式|Payment method)[：:\s]*([^\n]+)/i);
  const paymentMethod = paymentMatch ? paymentMatch[1].trim() : '';

  // Plan
  const planMatch = text.match(/(?:套餐|计划|Plan)[：:\s]*([^\n]+)/i);
  const plan = planMatch ? planMatch[1].trim() : '';

  // Create summary - prioritize subscription name over notification type
  const summary = subscriptionName && !subscriptionName.includes('_reminder_') ? subscriptionName : title;

  // Create details array
  const details: Array<{ label: string; value: string; icon: string }> = [];
  if (date) details.push({ label: t('history.expiryDate'), value: date, icon: '📅' });
  if (amount) details.push({ label: t('history.amount'), value: amount, icon: '💰' });
  if (paymentMethod) details.push({ label: t('history.paymentMethod'), value: paymentMethod, icon: '💳' });
  if (plan) details.push({ label: t('history.plan'), value: plan, icon: '📋' });

  // Action/tip
  const actionMatch = text.match(/(请及时续订以避免服务中断|请检查您的支付方式并手动续订|变更已生效|Please renew in time to avoid service interruption|Please check your payment method|The change has taken effect)/i);
  if (actionMatch) {
    details.push({ label: t('history.tip'), value: actionMatch[1], icon: '💡' });
  }

  return { summary, details, fullText: text };
};

export const NotificationHistory: React.FC = () => {
  const { t } = useTranslation('notification');
  const { toast } = useToast();
  
  const [history, setHistory] = useState<NotificationHistoryType[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [historyPagination, setHistoryPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const loadHistory = useCallback(async (page = 1) => {
    try {
      setHistoryLoading(true);
      const params: { page: number; limit: number; status?: string; type?: string } = {
        page,
        limit: historyPagination.limit
      };
      
      // Add filter parameters to API call
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }
      // Note: searchTerm and channelFilter still handled on frontend for now
      // as backend doesn't support these filters yet
      
      const response = await notificationApi.getHistory(params);
      setHistory(Array.isArray(response.data) ? response.data : []);
      setHistoryPagination(prev => ({
        ...prev,
        page: response.pagination.page,
        total: response.pagination.total,
        totalPages: Math.ceil(response.pagination.total / response.pagination.limit)
      }));
    } catch (error) {
      console.error('Failed to load notification history:', error);
      toast({
        title: t('fetchSettingsError'),
        description: t('fetchSettingsError'),
        variant: 'destructive'
      });
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPagination.limit, statusFilter, typeFilter, t, toast]);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await notificationApi.getStats();
      setStats(response);
    } catch (error) {
      console.error('Failed to load notification stats:', error);
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    loadStats();
  }, [loadHistory, loadStats]);

  // Reload data when status or type filter changes
  useEffect(() => {
    setHistoryPagination(prev => ({ ...prev, page: 1 }));
    loadHistory(1);
  }, [statusFilter, typeFilter, loadHistory]);

  const handlePageChange = (page: number) => {
    loadHistory(page);
  };

  const toggleExpanded = (itemId: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };



  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'sent':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Filter history based on search and channel filters (status and type are handled by backend)
  const filteredHistory = history.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.message_content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.recipient.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesChannel = channelFilter === 'all' || item.channel_type === channelFilter;
    
    return matchesSearch && matchesChannel;
  });

  // Define all possible filter options
  const allStatuses = ['sent', 'failed'];
  const allTypes = ['renewal_reminder', 'expiration_warning', 'renewal_success', 'renewal_failure', 'subscription_change'];
  const allChannels = ['telegram', 'email'];
  
  // Get unique values from current data for information purposes

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-8 w-8" />
            {t('history.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('history.description')}
          </p>
        </div>
        <Button
          onClick={() => {
            loadHistory(historyPagination.page);
            loadStats();
          }}
          disabled={historyLoading || statsLoading}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${historyLoading || statsLoading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.total')}</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.sent')}</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
              {/* <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? `${Math.round((stats.sent / stats.total) * 100)}%` : '0%'} {t('stats.successRate')}
              </p> */}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.failed')}</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.successRate')}</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.total > 0 ? `${Math.round((stats.sent / stats.total) * 100)}%` : '0%'}
              </div>
              {/* <p className="text-xs text-muted-foreground">
                {stats.sent}/{stats.total} {t('stats.success')}
              </p> */}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            {t('history.filterAndSearch')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <SearchInput
                placeholder={t('history.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="h-4 w-4 text-muted-foreground" />}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('history.statusFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('history.allStatuses')}</SelectItem>
                {allStatuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {t(`history.statuses.${status}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('history.typeFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('history.allTypes')}</SelectItem>
                {allTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {t(`types.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('history.channelFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('history.allChannels')}</SelectItem>
                {allChannels.map(channel => (
                  <SelectItem key={channel} value={channel}>
                    {t(`channels.${channel}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('history.title')}
          </CardTitle>
          <CardDescription>
            {searchTerm || channelFilter !== 'all' 
              ? t('history.recordsShown', { count: filteredHistory.length, total: historyPagination.total })
              : t('history.totalRecords', { total: historyPagination.total })
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('history.noHistory')}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((item) => {
                const parsedContent = parseMessageContent(item.message_content, t);
                const isExpanded = expandedItems.has(item.id);

                return (
                  <div
                    key={item.id}
                    className="border rounded-lg hover:bg-muted/30 transition-colors bg-card"
                  >
                    {/* Header - always visible */}
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => toggleExpanded(item.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <Badge variant={getStatusVariant(item.status)} className="text-xs">
                            {t(`history.statuses.${item.status}`)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {t(`types.${item.notification_type}`)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {t(`channels.${item.channel_type}`)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-muted-foreground">
                            {formatDate(item.scheduled_at)}
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {/* Summary - always visible */}
                      <div className="mt-2 text-sm font-medium text-foreground">
                        {item.subscription_name ? `${t('history.subscription')}: ${item.subscription_name}` : (parsedContent.summary || t('history.defaultMessage'))}
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t bg-muted/20">
                        <div className="pt-3 space-y-3">
                          {/* Details in vertical layout */}
                          {parsedContent.details.length > 0 && (
                            <div className="space-y-2">
                              {parsedContent.details.map((detail, index) => (
                                <div key={index} className="flex items-center gap-3 text-sm">
                                  <span className="text-lg">{detail.icon}</span>
                                  <span className="text-muted-foreground min-w-[80px]">{detail.label}:</span>
                                  <span className="font-medium">{detail.value}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Recipient info */}
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-lg">📧</span>
                            <span className="text-muted-foreground min-w-[80px]">{t('history.recipientLabel')}</span>
                            <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{item.recipient}</span>
                          </div>

                          {/* Timing info */}
                          {item.sent_at && (
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-lg">🕐</span>
                              <span className="text-muted-foreground min-w-[80px]">{t('history.sentTimeLabel')}</span>
                              <span className="font-medium">{formatDate(item.sent_at)}</span>
                            </div>
                          )}

                          {/* Error message if any */}
                          {item.error_message && (
                            <Alert className="border-destructive/20 bg-destructive/5">
                              <AlertCircle className="h-4 w-4 text-destructive" />
                              <AlertDescription className="text-sm text-destructive">
                                {item.error_message}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {historyPagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={historyPagination.page}
            totalPages={historyPagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};
