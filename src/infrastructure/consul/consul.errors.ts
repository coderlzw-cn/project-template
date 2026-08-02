/** Consul HTTP API 返回非预期状态码或网络请求失败。 */
export class ConsulApiError extends Error {
  constructor(
    readonly method: string,
    readonly path: string,
    readonly status: number,
    readonly responseBody: string,
    readonly retryable: boolean,
    options?: ErrorOptions,
  ) {
    super(status > 0 ? `Consul API 请求失败：${method} ${path} (${status})` : `Consul API 请求失败：${method} ${path}`, options);
    this.name = ConsulApiError.name;
  }
}

/** Consul 返回了与接口契约不符的响应。 */
export class ConsulResponseError extends Error {
  constructor(
    readonly path: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = ConsulResponseError.name;
  }
}
