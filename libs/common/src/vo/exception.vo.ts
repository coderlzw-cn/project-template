interface IValues {
  message: string | string[];
  status: number;
  timestamp: number;
  path: string;
  method: string;
  error?: string;
}
export class ExceptionVo {
  static build(values: IValues) {
    const body: Record<string, unknown> = {
      status: values.status,
      timestamp: values.timestamp,
      path: values.path,
      method: values.method,
      message: values.message,
    };
    if (values.error !== undefined) {
      body.error = values.error;
    }
    return body;
  }
}
