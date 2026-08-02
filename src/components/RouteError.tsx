import { isRouteErrorResponse, useRouteError } from "react-router";

/** 路由级错误页：捕获 loader/action/懒加载/渲染错误 */
export default function RouteError() {
  const error = useRouteError();

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-2">
      {isRouteErrorResponse(error) ? (
        <p>
          {error.status} {error.statusText}
        </p>
      ) : (
        <p>页面加载失败，请刷新重试</p>
      )}
    </div>
  );
}
