import { createBrowserRouter } from "react-router";
import RouteError from "@/components/RouteError";
import { ROUTES } from "@/constants/routes";
import BaseLayout from "@/layouts";

const router = createBrowserRouter([
  {
    path: ROUTES.HOME,
    Component: BaseLayout,
    // 路由级错误边界：捕获 loader/懒加载/渲染错误
    ErrorBoundary: RouteError,
    children: [
      {
        index: true,
        // 页面懒加载，按路由拆分 chunk
        lazy: async () => ({
          Component: (await import("@/pages/home")).default,
        }),
      },
      {
        path: ROUTES.NOT_FOUND,
        lazy: async () => ({
          Component: (await import("@/pages/not-found")).default,
        }),
      },
    ],
  },
]);

export default router;
