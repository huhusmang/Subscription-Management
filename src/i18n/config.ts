import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from './locales/en/common.json';
import enNavigation from './locales/en/navigation.json';
import enSubscription from './locales/en/subscription.json';
import enDashboard from './locales/en/dashboard.json';
import enSettings from './locales/en/settings.json';
import enValidation from './locales/en/validation.json';
import enReports from './locales/en/reports.json';
import enNotification from './locales/en/notification.json';
import enAuth from './locales/en/auth.json';

import zhCNCommon from './locales/zh-CN/common.json';
import zhCNNavigation from './locales/zh-CN/navigation.json';
import zhCNSubscription from './locales/zh-CN/subscription.json';
import zhCNDashboard from './locales/zh-CN/dashboard.json';
import zhCNSettings from './locales/zh-CN/settings.json';
import zhCNValidation from './locales/zh-CN/validation.json';
import zhCNReports from './locales/zh-CN/reports.json';
import zhCNNotification from './locales/zh-CN/notification.json';
import zhCNAuth from './locales/zh-CN/auth.json';

const resources = {
  en: {
    common: enCommon,
    navigation: enNavigation,
    subscription: enSubscription,
    dashboard: enDashboard,
    settings: enSettings,
    validation: enValidation,
    reports: enReports,
    notification: enNotification,
    auth: enAuth,
  },
  'zh-CN': {
    common: zhCNCommon,
    navigation: zhCNNavigation,
    subscription: zhCNSubscription,
    dashboard: zhCNDashboard,
    settings: zhCNSettings,
    validation: zhCNValidation,
    reports: zhCNReports,
    notification: zhCNNotification,
    auth: zhCNAuth,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    
    react: {
      useSuspense: true,
    },
    
    ns: ['common', 'navigation', 'subscription', 'dashboard', 'settings', 'validation', 'reports', 'notification', 'auth'],
    defaultNS: 'common',
  });

export default i18n;
