import { useAppStore } from '@/stores/app';
import { useCallback, useEffect, useRef } from 'react';

/** 可选择的主题模式。 */
export const Theme = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export type Theme = (typeof Theme)[keyof typeof Theme];
/** 用户未设置主题时使用系统偏好。 */
export const DEFAULT_THEME = Theme.SYSTEM;

/** 主题选择器展示的选项。 */
export const OPTIONS: Array<{ value: Theme; label: string }> = [
  { value: Theme.LIGHT, label: '浅色' },
  { value: Theme.DARK, label: '深色' },
  { value: Theme.SYSTEM, label: '跟随系统' },
];

/** 系统深色模式变化的媒体查询。 */
export const SYSTEM_DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';
/** 用户要求减少动态效果时关闭主题快照动画。 */
export const REDUCED_MOTION_MEDIA_QUERY = '(prefers-reduced-motion: reduce)';

/** 校验持久化数据或外部传入值是否为受支持的主题。 */
const isTheme = (value: unknown): value is Theme => value === Theme.LIGHT || value === Theme.DARK || value === Theme.SYSTEM;

/** 获取当前主题模式，优先级：传入的主题模式 > 已持久化的用户选择 > 系统主题。 */
export const getTheme = (theme?: Theme): Theme => {
  if (theme === undefined) {
    if (typeof window === 'undefined') return DEFAULT_THEME;
    const storedTheme = useAppStore.getState().theme;
    return isTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
  }

  if (theme !== Theme.SYSTEM || typeof window === 'undefined') return theme;
  return window.matchMedia(SYSTEM_DARK_MEDIA_QUERY).matches ? Theme.DARK : Theme.LIGHT;
};

/** 保存主题模式到状态管理，并应用到页面。 */
export const saveTheme = (themeMode: Theme, appliedTheme = getTheme(themeMode)) => {
  if (typeof window !== 'undefined') useAppStore.getState().setTheme(themeMode);
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.classList.toggle('dark', appliedTheme === Theme.DARK);
  root.dataset.theme = appliedTheme;
  root.style.colorScheme = appliedTheme;
};

export function useTheme() {
  // 共享 store 让多个 hook 调用点保持同步；持久化中无效值回退到系统模式。
  const storedTheme = useAppStore(state => state.theme);
  const themeState = isTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
  const activeTransitionRef = useRef<ViewTransition | null>(null);

  /** 更新主题；实际外观发生变化时，从触发点播放圆形快照过渡。 */
  const changeTheme = useCallback((nextTheme: Theme, origin?: { x: number; y: number }) => {
    if (!isTheme(nextTheme)) return;

    const previousAppliedTheme = getTheme(getTheme());
    const appliedTheme = getTheme(nextTheme);
    const commit = () => saveTheme(nextTheme, appliedTheme);

    // 仅在外观确实改变、用户未减少动态效果且浏览器支持快照时播放动画。
    const canAnimate =
      typeof window !== 'undefined' &&
      typeof document !== 'undefined' &&
      previousAppliedTheme !== appliedTheme &&
      !window.matchMedia(REDUCED_MOTION_MEDIA_QUERY).matches &&
      typeof document.startViewTransition === 'function';

    if (!canAnimate) {
      activeTransitionRef.current?.skipTransition();
      activeTransitionRef.current = null;
      commit();
      return;
    }

    const root = document.documentElement;
    activeTransitionRef.current?.skipTransition();
    if (origin) {
      root.style.setProperty('--reveal-x', `${origin.x}px`);
      root.style.setProperty('--reveal-y', `${origin.y}px`);
    }
    root.dataset.themeTransition = 'circle';

    const transition = document.startViewTransition(commit);
    activeTransitionRef.current = transition;

    const cleanup = () => {
      if (activeTransitionRef.current !== transition) return;
      activeTransitionRef.current = null;
      root.style.removeProperty('--reveal-x');
      root.style.removeProperty('--reveal-y');
      delete root.dataset.themeTransition;
    };
    void transition.finished.then(cleanup, cleanup);
  }, []);

  const resetTheme = useCallback(() => changeTheme(DEFAULT_THEME), [changeTheme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 等待持久化数据恢复后再应用，避免初始默认值覆盖用户选择。
    if (!useAppStore.persist.hasHydrated()) {
      useAppStore.persist.onFinishHydration(() => saveTheme(getTheme()));
    }

    // 仅在跟随系统模式下响应系统明暗偏好变化。
    const mediaQuery = window.matchMedia(SYSTEM_DARK_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      if (themeState === Theme.SYSTEM) saveTheme(themeState, event.matches ? Theme.DARK : Theme.LIGHT);
    };

    // 同步当前主题到根节点，并订阅系统主题变化。
    saveTheme(themeState);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeState]);

  return {
    theme: themeState,
    isDark: getTheme(themeState) === Theme.DARK,
    isLight: getTheme(themeState) === Theme.LIGHT,
    isSystem: themeState === Theme.SYSTEM,
    options: OPTIONS,
    changeTheme,
    resetTheme,
  };
}
