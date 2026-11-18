import type { Theme } from '@/hooks/useTheme';
import { getBrowserLanguage, type Language } from '@/i18n/language';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';



interface AppState {
  theme: Theme;
  language: Language;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
}


export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        theme: 'system',
        language: getBrowserLanguage(),
        setTheme: (theme) => set({ theme }, undefined, "app/setTheme"),
        setLanguage: language => set({ language }),
      }),
      {
        name: 'app-store',
        storage: createJSONStorage(() => sessionStorage),
      },
    ),
    // 设置了 name 后，开发环境下的 Redux DevTools 扩展会显示为指定名称，方便区分不同的 store。
    { name: "AppStore", enabled: import.meta.env.DEV },
  ),
);
