export const ThemeMode = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export type ThemeMode = (typeof ThemeMode)[keyof typeof ThemeMode];

export type ResolvedTheme = typeof ThemeMode.LIGHT | typeof ThemeMode.DARK;

export const DEFAULT_THEME_MODE = ThemeMode.SYSTEM;

export const THEME_STORAGE_KEY = 'app-theme';

export interface ThemeOption {
  value: ThemeMode;
  label: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    value: ThemeMode.LIGHT,
    label: '浅色',
  },
  {
    value: ThemeMode.DARK,
    label: '深色',
  },
  {
    value: ThemeMode.SYSTEM,
    label: '跟随系统',
  },
];

function isThemeMode(value: unknown): value is ThemeMode {
  return (
    value === ThemeMode.LIGHT ||
    value === ThemeMode.DARK ||
    value === ThemeMode.SYSTEM
  );
}

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return DEFAULT_THEME_MODE;

  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(value) ? value : DEFAULT_THEME_MODE;
  } catch {
    return DEFAULT_THEME_MODE;
  }
}

export function saveThemeMode(themeMode: ThemeMode): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  } catch {
    // 隐私模式、存储空间不足等情况下忽略缓存失败。
  }
}

export const SYSTEM_DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return ThemeMode.LIGHT;

  return window.matchMedia(SYSTEM_DARK_MEDIA_QUERY).matches
    ? ThemeMode.DARK
    : ThemeMode.LIGHT;
}

export function resolveTheme(themeMode: ThemeMode): ResolvedTheme {
  if (themeMode === ThemeMode.SYSTEM) return getSystemTheme();

  return themeMode;
}

export function applyTheme(resolvedTheme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const isDark = resolvedTheme === ThemeMode.DARK;

  root.classList.toggle('dark', isDark);

  root.dataset.theme = resolvedTheme;

  root.style.colorScheme = resolvedTheme;
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

export interface UseThemeResult {
  /**
   * 用户选择的主题模式。
   *
   * 可能是 light、dark 或 system。
   */
  themeMode: ThemeMode;

  /**
   * 最终实际生效的主题。
   *
   * 只会是 light 或 dark。
   */
  resolvedTheme: ResolvedTheme;

  /**
   * 是否为深色主题。
   */
  isDark: boolean;

  /**
   * 是否为浅色主题。
   */
  isLight: boolean;

  /**
   * 是否跟随系统。
   */
  isSystem: boolean;

  /**
   * 可用于 Select、Radio 等组件的主题选项。
   */
  themeOptions: typeof THEME_OPTIONS;

  /**
   * 设置主题模式。
   */
  setThemeMode: (themeMode: ThemeMode) => void;

  /**
   * 在浅色和深色主题之间切换。
   *
   * 调用后会退出 system 模式。
   */
  toggleTheme: () => void;

  /**
   * 重置为跟随系统。
   */
  resetTheme: () => void;
}

export function useTheme(): UseThemeResult {
  const activeThemeTransitionRef = useRef<ViewTransition | null>(null);

  const [themeMode, setThemeModeState] = useState<ThemeMode>(() =>
    getStoredThemeMode(),
  );

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    getSystemTheme(),
  );

  const resolvedTheme = useMemo(
    () =>
      themeMode === ThemeMode.SYSTEM ? systemTheme : resolveTheme(themeMode),
    [systemTheme, themeMode],
  );

  const commitThemeMode = useCallback(
    (nextThemeMode: ThemeMode, nextResolvedTheme: ResolvedTheme) => {
      applyTheme(nextResolvedTheme);
      setThemeModeState(nextThemeMode);
      saveThemeMode(nextThemeMode);
    },
    [],
  );

  const setThemeMode = useCallback(
    (nextThemeMode: ThemeMode) => {
      const nextResolvedTheme = resolveTheme(nextThemeMode);
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;

      if (
        typeof document.startViewTransition !== 'function' ||
        prefersReducedMotion ||
        nextResolvedTheme === resolvedTheme
      ) {
        commitThemeMode(nextThemeMode, nextResolvedTheme);
        return;
      }

      // 连续切换时结束上一段动画，避免多个页面快照叠加。
      activeThemeTransitionRef.current?.skipTransition();

      const root = document.documentElement;
      root.dataset.themeTransition =
        nextResolvedTheme === ThemeMode.DARK ? 'to-dark' : 'to-light';

      const transition = document.startViewTransition(() => {
        // 在回调结束前同步提交新主题，保证浏览器截取到正确的新快照。
        flushSync(() => {
          commitThemeMode(nextThemeMode, nextResolvedTheme);
        });
      });

      activeThemeTransitionRef.current = transition;

      const cleanupTransition = () => {
        if (activeThemeTransitionRef.current !== transition) return;

        activeThemeTransitionRef.current = null;
        delete root.dataset.themeTransition;
      };

      void transition.finished.then(cleanupTransition, cleanupTransition);
    },
    [commitThemeMode, resolvedTheme],
  );

  const toggleTheme = useCallback(() => {
    setThemeMode(
      resolvedTheme === ThemeMode.DARK ? ThemeMode.LIGHT : ThemeMode.DARK,
    );
  }, [resolvedTheme, setThemeMode]);

  const resetTheme = useCallback(() => {
    setThemeMode(ThemeMode.SYSTEM);
  }, [setThemeMode]);

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(SYSTEM_DARK_MEDIA_QUERY);

    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? ThemeMode.DARK : ThemeMode.LIGHT);
    };

    setSystemTheme(mediaQuery.matches ? ThemeMode.DARK : ThemeMode.LIGHT);

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return {
    themeMode,
    resolvedTheme,

    isDark: resolvedTheme === ThemeMode.DARK,
    isLight: resolvedTheme === ThemeMode.LIGHT,
    isSystem: themeMode === ThemeMode.SYSTEM,

    themeOptions: THEME_OPTIONS,

    setThemeMode,
    toggleTheme,
    resetTheme,
  };
}
