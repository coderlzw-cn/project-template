import { Component, type ErrorInfo, type PropsWithChildren } from 'react';

interface State {
  error: Error | null;
}

/** 全局错误边界：捕获渲染阶段的未处理异常，避免白屏 */
export default class ErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 可在此接入监控平台（如 Sentry）上报
    console.error(error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className='flex h-screen flex-col items-center justify-center gap-2'>
          <p>页面出错了，请刷新重试</p>
        </div>
      );
    }
    return this.props.children;
  }
}
