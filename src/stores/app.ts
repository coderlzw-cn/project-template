import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface AppState {
  /** 主题模式 */
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

/**
 * 应用级全局状态（zustand）
 *
 * 约定：
 * - 每个业务域一个 store 文件，放在 src/stores/ 下（如 user.ts、app.ts）
 * - 组件中按需选取字段，避免整个 store 订阅导致多余渲染：
 *   const theme = useAppStore(state => state.theme)
 * - 需要跨刷新保留的状态用 persist 中间件持久化到 localStorage
 */
export const useAppStore = create<AppState>()(
  persist(
    set => ({
      theme: 'light',
      setTheme: theme => set({ theme }),
    }),
    // localStorage 的 key
    { name: 'app-store' },
  ),
);
