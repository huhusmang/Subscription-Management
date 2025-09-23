import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';
import { Mail, Loader2, Send, Save, Settings, Check, X } from 'lucide-react';
import { notificationApi } from '@/services/notificationApi';
import { useToast } from '@/hooks/use-toast';
import { useNotificationStore } from '@/store/notificationStore';

interface EmailConfigProps {
  onConfigChange?: () => void;
}

interface EmailChannelConfig {
  email: string;
}

interface ConfigResponse {
  config?: EmailChannelConfig;
  is_active?: boolean;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EmailConfig: React.FC<EmailConfigProps> = ({ onConfigChange }) => {
  const { t } = useTranslation('notification');
  const { toast } = useToast();

  const {
    channelConfigs,
    setEmailConfig,
    setChannelValidated
  } = useNotificationStore();

  const [emailAddress, setEmailAddress] = useState(channelConfigs.email?.email || '');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [isActive, setIsActive] = useState<boolean>(false);

  const isEmailValid = useMemo(() => emailRegex.test(emailAddress.trim()), [emailAddress]);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notificationApi.getChannelConfig('email');
      const configResponse = response as unknown as ConfigResponse;
      const configEmail = configResponse?.config?.email || '';

      setEmailAddress(configEmail);
      setIsActive(Boolean(configResponse?.is_active));

      if (configEmail) {
        setEmailConfig({ email: configEmail, validated: true });
        setChannelValidated('email', true);
      }
    } catch (error) {
      // 404 indicates channel not yet configured; keep local state
      setIsActive(false);
    } finally {
      setLoading(false);
    }
  }, [setEmailConfig, setChannelValidated]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleEmailChange = (value: string) => {
    setEmailAddress(value);
    const valid = emailRegex.test(value.trim());
    setEmailConfig({ email: value, validated: valid });
    setChannelValidated('email', valid);
  };

  const handleSave = async () => {
    const trimmedEmail = emailAddress.trim();
    if (!emailRegex.test(trimmedEmail)) {
      toast({
        title: t('errors.invalidEmail'),
        description: t('emailConfig.help'),
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);
      await notificationApi.configureChannel('email', { email: trimmedEmail });
      toast({
        title: t('emailConfig.saved'),
        description: t('channelConfigured')
      });
      await loadConfig();
      onConfigChange?.();
    } catch (error) {
      console.error('Failed to save email config:', error);
      toast({
        title: t('emailConfig.saveError'),
        description: t('errors.configSaveFailed'),
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    const trimmedEmail = emailAddress.trim();
    if (!emailRegex.test(trimmedEmail)) {
      toast({
        title: t('errors.invalidEmail'),
        description: t('emailConfig.help'),
        variant: 'destructive'
      });
      return;
    }

    try {
      setTesting(true);
      await notificationApi.testNotification('email');
      toast({
        title: t('testSuccess'),
        description: t('testSuccess')
      });
    } catch (error) {
      console.error('Failed to send test email:', error);
      toast({
        title: t('testFailed'),
        description: t('errors.sendFailed'),
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  const renderStatusBadge = () => {
    if (!emailAddress) {
      return <Badge variant="secondary">{t('channelNotConfigured')}</Badge>;
    }

    if (isEmailValid) {
      return <Badge variant="default" className="bg-green-500">{t('configured')}</Badge>;
    }

    return <Badge variant="destructive">{t('errors.invalidEmail')}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          {t('email')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isActive && (
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription className="flex items-center gap-2">
              <span>{t('emailConfig.active')}</span>
              {renderStatusBadge()}
            </AlertDescription>
          </Alert>
        )}

        {!isEmailValid && emailAddress && (
          <Alert variant="destructive">
            <X className="h-4 w-4" />
            <AlertDescription>{t('errors.invalidEmail')}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email-recipient">{t('emailConfig.address')}</Label>
          <Input
            id="email-recipient"
            type="email"
            value={emailAddress}
            placeholder="user@example.com"
            onChange={(event) => handleEmailChange(event.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground whitespace-pre-line">
            {t('emailConfig.help')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving || !isEmailValid}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('save')}
          </Button>
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={!isEmailValid || testing}
            className="flex items-center gap-2"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {t('test')}
          </Button>
        </div>

        {isEmailValid && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check className="h-4 w-4" />
            <span>{t('emailConfig.valid')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailConfig;
