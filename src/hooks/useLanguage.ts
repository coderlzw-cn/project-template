import { toError } from '@/utils/error';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppStore } from '@/stores/app';
import { DEFAULT_LANGUAGE, LANGUAGE_LABELS, isSupportedLanguage, SUPPORTED_LANGUAGES, type Language } from '@/i18n/language';

export const LANGUAGE_OPTIONS: Array<{ value: Language; label: string }> = SUPPORTED_LANGUAGES.map(value => ({
  value,
  label: LANGUAGE_LABELS[value],
}));

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
      if (!isSupportedLanguage(nextLanguage) || isChangingRef.current) return false;
      isChangingRef.current = true;
      setIsChanging(true);
      setError(null);

      try {
        const currentLanguage = i18n.resolvedLanguage;
        if (currentLanguage !== nextLanguage) {
          await i18n.changeLanguage(nextLanguage);
        }

        if (persist) {
          useAppStore.getState().setLanguage(nextLanguage);
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

  const changeLanguage = useCallback((language: Language) => applyLanguage(language, true), [applyLanguage]);

  const resetLanguage = useCallback(() => applyLanguage(DEFAULT_LANGUAGE, true), [applyLanguage]);

  const clearError = useCallback(() => setError(null), []);

  return {
    language: i18n.resolvedLanguage ?? i18n.language,
    setLanguage: changeLanguage,
    resetLanguage,
    isChanging,
    error,
    clearError,
  };
}
