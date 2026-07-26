// 将 node_modules 保留为运行时 require，避免把全部服务端依赖打进 bundle。
const nodeExternals = require('webpack-node-externals');
// 首次构建完成后启动 dist/main.js，并在 watch 期间保持该子进程运行。
const { RunScriptWebpackPlugin } = require('run-script-webpack-plugin');

/**
 * Nest CLI 会把默认 Webpack 配置和 Webpack 实例传入此函数。
 * 在默认配置基础上追加 Node.js 服务端 HMR，避免覆盖 Nest 已配置的
 * TypeScript loader、路径别名、输出目录等内容。
 */
module.exports = function (options, webpack) {
  return {
    ...options,
    // 开发环境保留完整 TypeScript 映射，异常堆栈可直接定位到源码。
    devtool: 'inline-source-map',
    // 将模块构建结果持久化到 node_modules/.cache/webpack，
    // 使开发进程重启后的首次构建也能复用缓存。
    cache: {
      type: 'filesystem',
      buildDependencies: {
        // 配置文件发生变化时自动使旧缓存失效。
        config: [__filename],
      },
    },
    output: {
      ...options.output,
      // HMR 每次编译都会生成 manifest JSON 和更新 chunk。
      // emit 前清理不再属于当前编译的文件，避免历史热更新文件持续堆积。
      clean: true,
    },
    // Node.js 没有浏览器端 HMR 客户端，通过轮询每 300ms 检查更新，
    // 在更新响应速度和 CPU 唤醒频率之间取得平衡。
    entry: ['webpack/hot/poll?300', options.entry],
    externals: [
      nodeExternals({
        // HMR 轮询模块必须进入 bundle，否则运行时无法接收到更新。
        allowlist: ['webpack/hot/poll?300'],
      }),
    ],
    plugins: [
      ...options.plugins,
      // 生成模块热更新清单和运行时代码。
      new webpack.HotModuleReplacementPlugin(),
      // 忽略构建产物，防止输出文件再次触发 watch，形成重复编译。
      new webpack.WatchIgnorePlugin({
        paths: [/\.js$/, /\.d\.ts$/],
      }),
      // 启动构建后的 Nest 入口；HMR 生命周期由 src/main.ts 中的
      // module.hot.accept() 和 module.hot.dispose(() => app.close()) 负责。
      new RunScriptWebpackPlugin({
        name: options.output.filename,
        // 不在每次编译后强制重启，优先使用真正的模块热替换。
        autoRestart: false,
        // HMR 无法接受某些依赖图变化时，可在终端输入 rs 完整重启。
        keyboard: true,
      }),
    ],
  };
};
