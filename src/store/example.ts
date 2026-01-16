import { create } from "zustand";
import { persist, createJSONStorage, devtools } from "zustand/middleware";

// 1. 定义状态类型
interface UserState {
  userInfo: { name: string; email: string } | null;
  token: string | null;
  isLoading: boolean;

  // 2. 定义 Actions 类型
  setToken: (token: string) => void;
  fetchUser: (userId: string) => Promise<void>;
  logout: () => void;
}

// 3. 创建 Store
export const useUserStore = create<UserState>()(
  devtools(
    // 开启持久化中间件（自动存入 localStorage）
    persist(
      (set, _get) => ({
        userInfo: null,
        token: null,
        isLoading: false,

        // 同步 Action
        setToken: (token) => set({ token }),

        // 异步 Action (处理登录或获取用户信息)
        fetchUser: async (userId) => {
          set({ isLoading: true });
          try {
            // 模拟请求 NestJS 后端
            const response = await fetch(`/api/users/${userId}`);
            const data = await response.json();
            set({ userInfo: data, isLoading: false });
          } catch (error) {
            set({ isLoading: false });
            console.error("Fetch user failed", error);
          }
        },

        // 重置状态
        logout: () => set({ userInfo: null, token: null }),
      }),
      {
        name: "user-storage", // 存储在 localStorage 中的 key
        storage: createJSONStorage(() => localStorage), // (可选) 默认就是 localStorage
        partialize: (state) => ({ token: state.token }), // (可选) 只持久化 token，不持久化用户信息
      },
    ),
  ),
);
