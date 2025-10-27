import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { cn } from '@/lib/utils';
import { apiClient } from '@/utils/api-client';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'zh-CN', name: '简体中文' },
];

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation('settings');

  const handleLanguageChange = async (language: string) => {
    i18n.changeLanguage(language);
    localStorage.setItem('language', language);

    // 同步到后端设置
    try {
      await apiClient.put('/user-preferences/language', { language });
    } catch {
      // 后端失败不阻塞前端切换
      // 可选：在此加入 toast 提示
    }
  };

  // 初始化时从后端读取语言并同步到 i18n
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const res = await apiClient.get<{ language: string; languageName: string }>(
          '/user-preferences/language'
        );
        if (res?.language && res.language !== i18n.language) {
          i18n.changeLanguage(res.language);
          localStorage.setItem('language', res.language);
        }
      } catch {
        // 忽略错误，保持现有 i18n 检测逻辑（localStorage / 浏览器）
      }
    };
    loadLanguage();
  }, [i18n]);

  const currentLanguage = languages.find(lang => lang.code === i18n.language);

  return (
    <Select value={i18n.language} onValueChange={handleLanguageChange}>
      <SelectTrigger className={cn(
        "w-auto min-w-0 px-3 py-2 h-9 gap-1.5"
      )}>
        <Globe className="h-4 w-4" />
        <SelectValue>
          {currentLanguage?.name || t('language')}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            {lang.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}