import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw, BarChart3, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { notificationApi, NotificationSetting } from '@/services/notificationApi';
import { useToast } from '@/hooks/use-toast';
import { TelegramConfig } from './TelegramConfig';
import { EmailConfig } from './EmailConfig';
import { NotificationRules } from './NotificationRules';
import { SchedulerSettings } from './SchedulerSettings';

interface NotificationSettingsProps {
  userId: number;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ userId }) => {
  const { t } = useTranslation('notification');
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notificationApi.getSettings();
      // The API client already extracts the data field, so response is the data directly
      setSettings(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      toast({
        title: t('fetchSettingsError'),
        description: t('fetchSettingsError'),
        variant: 'destructive'
      });
      // Set empty array on error to prevent undefined
      setSettings([]);
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSetting = async (setting: NotificationSetting) => {
    try {
      await notificationApi.updateSetting(setting.id, setting);
      
      // Update local state
      setSettings(prev => prev.map(s => s.id === setting.id ? setting : s));
      
      toast({
        title: t('settingUpdated'),
        description: t('settingUpdated')
      });
    } catch (error) {
      console.error('Failed to update setting:', error);
      toast({
        title: t('updateSettingError'),
        description: t('updateSettingError'),
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8" />
            {t('notificationSettings')}
          </h1>
          <p className="text-muted-foreground">
            {t('managePreferencesDesc')}
          </p>
        </div>
        <Button
          onClick={loadSettings}
          disabled={loading}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      </div>

      <Tabs defaultValue="channels" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="channels" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t('channelConfig')}
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t('notificationRules')}
          </TabsTrigger>
          <TabsTrigger value="scheduler" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t('scheduler.title')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <TelegramConfig 
              userId={userId}
              onConfigChange={loadSettings}
            />
            <EmailConfig 
              onConfigChange={loadSettings}
            />
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('notificationRules')}</CardTitle>
              <CardDescription>
                {t('managePreferencesDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationRules
                settings={settings}
                onUpdate={updateSetting}
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduler" className="space-y-6">
          <SchedulerSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};
