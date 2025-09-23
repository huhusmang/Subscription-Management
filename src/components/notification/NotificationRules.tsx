import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Bell, Calendar, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NotificationSetting } from '@/services/notificationApi';

interface NotificationRulesProps {
  settings: NotificationSetting[];
  onUpdate: (setting: NotificationSetting) => void;
  loading?: boolean;
}

export const NotificationRules: React.FC<NotificationRulesProps> = ({ 
  settings, 
  onUpdate, 
  loading = false 
}) => {
  const { t } = useTranslation('notification');

  const handleToggleEnabled = (setting: NotificationSetting, enabled: boolean) => {
    onUpdate({ ...setting, is_enabled: enabled });
  };

  const handleAdvanceDaysChange = (setting: NotificationSetting, days: number) => {
    onUpdate({ ...setting, advance_days: days });
  };

  const handleRepeatNotificationChange = (setting: NotificationSetting, repeat: boolean) => {
    onUpdate({ ...setting, repeat_notification: repeat });
  };

  const handleChannelToggle = (setting: NotificationSetting, channel: string) => {
    const currentChannels = Array.isArray(setting.notification_channels) ? setting.notification_channels : ['telegram'];
    const channels = currentChannels.includes(channel)
      ? currentChannels.filter(c => c !== channel)
      : [...currentChannels, channel];

    onUpdate({ ...setting, notification_channels: channels });
  };

  const renderChannelBadges = (setting: NotificationSetting) => {
    const availableChannels = ['telegram', 'email'];
    
    return (
      <div className="flex gap-2 flex-wrap">
        {availableChannels.map((channel) => {
          const currentChannels = Array.isArray(setting.notification_channels) ? setting.notification_channels : ['telegram'];
          return (
            <Badge
              key={channel}
              variant={currentChannels.includes(channel) ? 'default' : 'secondary'}
              className="cursor-pointer transition-colors"
              onClick={() => setting.is_enabled && handleChannelToggle(setting, channel)}
          >
            {t(`channels.${channel}`)}
          </Badge>
          );
        })}
      </div>
    );
  };

  const renderAdvanceDaysInput = (setting: NotificationSetting) => {
    // Only renewal_reminder needs advance_days configuration
    // expiration_warning is sent exactly 1 day after expiration (fixed timing)
    if (setting.notification_type === 'renewal_reminder') {
      return (
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">
            {t('advanceDays')}:
          </Label>
          <Input
            type="number"
            min="1"
            max="30"
            value={setting.advance_days}
            onChange={(e) => {
              const days = Math.max(1, Math.min(30, parseInt(e.target.value) || 1));
              handleAdvanceDaysChange(setting, days);
            }}
            className="w-16"
            disabled={!setting.is_enabled || loading}
          />
          <span className="text-sm text-muted-foreground">
            {t('days', { ns: 'common' })}
          </span>
        </div>
      );
    }
    return null;
  };

  const renderRepeatNotificationSwitch = (setting: NotificationSetting) => {
    // Only renewal_reminder supports repeat notification setting
    if (setting.notification_type === 'renewal_reminder') {
      return (
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm">
              {t('repeatNotification')}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t('repeatNotificationDescription')}
            </p>
          </div>
          <Switch
            checked={setting.repeat_notification || false}
            onCheckedChange={(repeat) => handleRepeatNotificationChange(setting, repeat)}
            disabled={!setting.is_enabled || loading}
          />
        </div>
      );
    }
    return null;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'renewal_reminder':
        return <Calendar className="h-4 w-4" />;
      case 'expiration_warning':
        return <Bell className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {settings && Array.isArray(settings) ? settings.map((setting) => (
        <Card key={setting.notification_type}>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    {getNotificationIcon(setting.notification_type)}
                    <h4 className="font-medium">
                      {t(`types.${setting.notification_type}`)}
                    </h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(`descriptions.${setting.notification_type}`)}
                  </p>
                </div>
                
                <Switch
                  checked={setting.is_enabled}
                  onCheckedChange={(enabled) => handleToggleEnabled(setting, enabled)}
                  disabled={loading}
                />
              </div>

              {/* Configuration (only shown when enabled) */}
              {setting.is_enabled && (
                <div className="space-y-4 pl-6 border-l-2 border-muted">
                  {/* Advance Days */}
                  {renderAdvanceDaysInput(setting)}

                  {/* Repeat Notification */}
                  {renderRepeatNotificationSwitch(setting)}

                  {/* Channels */}
                  <div className="space-y-2">
                    <Label className="text-sm">
                      {t('channelsLabel')}:
                    </Label>
                    {renderChannelBadges(setting)}
                  </div>

                </div>
              )}

              {/* Status */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    setting.is_enabled ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  <span className="text-sm text-muted-foreground">
                    {setting.is_enabled ? t('enabled') : t('disabled')}
                  </span>
                </div>
                
                {setting.is_enabled && (
                  <div className="text-xs text-muted-foreground">
                    {t('channelsLabel')}: {Array.isArray(setting.notification_channels) ? setting.notification_channels.join(', ') : 'telegram'}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )) : (
        <div className="text-center py-8 text-muted-foreground">
          {t('noSettingsFound', 'No notification settings found')}
        </div>
      )}
    </div>
  );
};
