import axios, { type AxiosResponse } from "axios";

/**
 * 只要是这些类型，就直接返回原始数据，不进行 { code, message, data } 包裹
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
  baseURL: "/api",
  withCredentials: false,
  adapter: "fetch", // 使用 fetch 适配器，完美支持 ReadableStream
});

// 拦截器部分
http.interceptors.response.use(
  (response) => {
    // 你可以在这里根据 response.data 的类型做统一处理
    // 例如：如果是流，直接返回；如果是 JSON 且 code 不为 200，则抛出异常
    const { data } = response;

    // 逻辑示例：如果后端返回了业务错误码，在这里统一拦截
    if (data && typeof data === "object" && "code" in data) {
      if (data.code !== 200 && data.code !== 0) {
        // 这里可以弹出 UI 提示
        return Promise.reject(new Error(data.message || "Error"));
      }
    }

    return response;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default http;
