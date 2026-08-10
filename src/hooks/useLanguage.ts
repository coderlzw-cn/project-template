import {
  DEFAULT_LANGUAGE,
  LANGUAGE_LABELS,
  Language,
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
  normalizeLanguage,
} from '@/i18n/constants';
import { appStorage } from '@/lib/app-storage';
import { toError } from '@/utils/error';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface LanguageOption {
  value: Language;
  label: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = SUPPORTED_LANGUAGES.map(
  value => ({
    value,
    label: LANGUAGE_LABELS[value],
  }),
);

export function useLanguage() {
  const { i18n } = useTranslation();
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isChangingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // React StrictMode 会在开发环境额外执行一次 effect 清理与重建。
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const applyLanguage = useCallback(
    async (nextLanguage: Language, persist: boolean): Promise<boolean> => {
      if (!isSupportedLanguage(nextLanguage) || isChangingRef.current)
        return false;

      isChangingRef.current = true;
      setIsChanging(true);
      setError(null);

      try {
        const currentLanguage = normalizeLanguage(
          i18n.resolvedLanguage ?? i18n.language,
        );
        if (currentLanguage !== nextLanguage)
          await i18n.changeLanguage(nextLanguage);

        if (persist) {
          const result = appStorage.set('language', nextLanguage);
          if (!result.ok || !result.persisted)
            throw new Error('语言已切换，但偏好设置无法持久保存');
        } else {
          appStorage.remove('language');
        }

        return true;
      } catch (changeError) {
        if (isMountedRef.current) setError(toError(changeError));
        return false;
      } finally {
        isChangingRef.current = false;
        if (isMountedRef.current) setIsChanging(false);
      }
    },
    [i18n],
  );

  const setLanguage = useCallback(
    (language: Language) => applyLanguage(language, true),
    [applyLanguage],
  );

  const resetLanguage = useCallback(
    () => applyLanguage(DEFAULT_LANGUAGE, false),
    [applyLanguage],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    language: normalizeLanguage(i18n.resolvedLanguage ?? i18n.language),
    setLanguage,
    resetLanguage,
    isChanging,
    error,
    clearError,
  };
}
