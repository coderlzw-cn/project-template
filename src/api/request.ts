import axios, { type AxiosResponse } from "axios";

declare module "axios" {
  interface AxiosRequestConfig {
    /** 单次请求关闭全局错误提示，错误仍会正常 reject。 */
    silentError?: boolean;
    /** 请求不经过后端全局 API 前缀，例如 /health 下的健康检查接口。 */
    skipApiPrefix?: boolean;
  }
}

/**
 * 只要是这些类型，就直接返回原始数据，不进行 { code, message, data } 解包
 */
type RawData = Blob | ReadableStream | ArrayBuffer | FormData | URLSearchParams | string | void;

/**
 * T: 业务数据类型
 * 如果想返回完全自定义的 JSON 结构，可以将 T 设置为这种结构的接口，并确保它不属于 RawData
 */
export type ApiResponse<T = void> = Promise<
  AxiosResponse<T extends RawData ? T : { code: number; message: string; data: T }>
>;

const http = axios.create({
  baseURL: `${import.meta.env.BASE_URL}api/v1`,
  withCredentials: false,
  adapter: "fetch",
});

const HTTP_ERROR_MESSAGE_THROTTLE_MS = 3000;
/** 这些接口通常由定时任务调用，失败时不弹出全局 message。 */
const SILENT_ERROR_PATHS = new Set(["/metrics/delay", "/metrics/doppler"]);

function isSilentErrorRequest(config?: { url?: string; silentError?: boolean }) {
  if (config?.silentError) {
    return true;
  }

  if (!config?.url) {
    return false;
  }

  const pathname = new URL(config.url, window.location.origin).pathname;
  return Array.from(SILENT_ERROR_PATHS).some(path => pathname === path || pathname.endsWith(path));
}

let lastHttpErrorMessage = {
  key: "",
  time: 0,
};

function showHttpErrorMessage(options: { title: string; description: string; dedupeKey?: string }) {
  const now = Date.now();
  const key = options.dedupeKey ?? options.description;

  if (
    lastHttpErrorMessage.key === key &&
    now - lastHttpErrorMessage.time < HTTP_ERROR_MESSAGE_THROTTLE_MS
  ) {
    return;
  }

  lastHttpErrorMessage = { key, time: now };
}

http.interceptors.request.use(config => {
  if (config.skipApiPrefix) {
    config.baseURL = import.meta.env.BASE_URL;
  }

  return config;
});

http.interceptors.response.use(
  response => {
    const { data } = response;

    // 判断是否是符合约定的标准后端统一响应结构
    const isStandardResponse =
      data && typeof data === "object" && "code" in data && "message" in data;

    if (isStandardResponse) {
      // 业务请求成功
      if (data.code === 200 || data.code === "200") {
        // 如果有包装的 data 字段则返回 data，否则返回整个业务数据对象（兼容某些只返回 code/msg 的接口）
        return "data" in data ? data.data : data;
      }

      // 统一拦截业务错误（例如：密码错误、余额不足，状态码仍是 200，但 code 不是 200）
      if (!isSilentErrorRequest(response.config)) {
      }
      return Promise.reject(new Error(data.message || "Business Error"));
    }

    // 非标准结构（如：文件流、非约定的第三方接口），直接返回原始 response 或 data
    return response;
  },
  error => {
    // 4. 完善错误处理，兼容断网、超时等无 response 的情况
    let errorMsg = "网络连接异常，请稍后再试";

    if (error.response) {
      // 存在 HTTP 状态码错误 (4xx, 5xx)
      const status = error.response.status;
      const data = error.response.data;

      // 优先使用后端返回的错误信息，其次根据状态码兜底
      errorMsg = data?.message || `服务器异常 (错误码: ${status})`;

      // 可以在这里针对特定状态码做特殊处理
      if (status === 401) {
        // 例如：清除 token 并跳转登录页
      }
    } else if (error.code === "ECONNABORTED" && error.message.includes("timeout")) {
      errorMsg = "请求超时，请检查网络后重试";
    }
    if (!isSilentErrorRequest(error.config)) {
      showHttpErrorMessage({
        title: "错误",
        description: errorMsg,
        dedupeKey: error.response?.status >= 500 ? "server-error" : errorMsg,
      });
    }

    return Promise.reject(error);
  },
);

export default http;
