const nodeExternals = require('webpack-node-externals');
const { RunScriptWebpackPlugin } = require('run-script-webpack-plugin');

module.exports = function (options, webpack) {
  return {
    // 继承 Nest CLI 默认配置（ts-loader、target: node、resolve 等）
    ...options,
    // Node 环境没有浏览器那种原生 HMR，需要注入轮询入口来建立热更新通道， poll?100 表示每 100ms 检查一次文件变更
    entry: ['webpack/hot/poll?100', options.entry],
    externals: [
      nodeExternals({
        // node_modules 不打包进 bundle，减小体积、加快编译，但 HMR 轮询模块必须打包进来，否则热更新无法工作
        allowlist: ['webpack/hot/poll?100'],
      }),
    ],
    // 减少 watch 监听的文件数，避免 macOS 上 EMFILE（too many open files）错误
    watchOptions: {
      ignored: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
      aggregateTimeout: 300, // 防抖，连续保存时减少重复编译
    },
    // 持久化缓存，加快二次编译：
    // cache: {
    //   type: 'filesystem',
    //   buildDependencies: {
    //     config: [__filename],
    //   },
    // },
    // Nest 默认只在 --debug 时开 inline-source-map。若希望 HMR 开发时也能断点调试，可加：
    // devtool: 'inline-source-map',
    // stats: 'errors-warnings',
    plugins: [
      ...options.plugins,
      new webpack.HotModuleReplacementPlugin(),
      // 忽略 dist 输出的 .js / .d.ts，防止「输出文件变更 → 再次触发编译」的死循环
      new webpack.WatchIgnorePlugin({
        paths: [/\.js$/, /\.d\.ts$/],
      }),
      // 首次编译完成后自动执行输出文件（如 dist/main.js），相当于帮你 node dist/main.js
      new RunScriptWebpackPlugin({
        name: options.output.filename,
        // false：后续 rebuild 不自动杀进程重启，由 main.ts 的 module.hot 接管热更新，若设为 true，每次保存都会整进程重启，失去 HMR 意义
        autoRestart: false,
      }),
    ],
  };
};
