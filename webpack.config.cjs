const nodeExternals = require('webpack-node-externals');
const {RunScriptWebpackPlugin} = require('run-script-webpack-plugin');
require('dotenv').config({ quiet: true });
/**
 * Nest CLI 会把默认 Webpack 配置和 Webpack 实例传入此函数。
 * 在默认配置基础上追加 Node.js 服务端 HMR，避免覆盖 Nest 已配置的
 * TypeScript loader、路径别名、输出目录等内容。
 */
module.exports = function (options, webpack) {
    const isProduction = process.env.NODE_ENV === 'production';
    // 仅当显式 NODE_ENV=development（pnpm dev / dev:debug）时启用 HMR 和 RunScriptWebpackPlugin；
    // nest start 系列不设 NODE_ENV，由 Nest CLI 自己启动应用，避免与插件双进程抢端口。
    const isDevelopment = process.env.NODE_ENV === 'development';

    return {
        ...options,
        mode: isProduction ? 'production' : 'development',
        devtool: isProduction ? false : 'inline-source-map',
        optimization: {
            ...options.optimization,
            minimize: isProduction,
        },
        // 将模块构建结果持久化到 node_modules/.cache/webpack，使开发进程重启后的首次构建也能复用缓存。
        cache: {
            type: 'filesystem',
            // 配置文件本身变化时自动使缓存失效
            buildDependencies: {
                config: [__filename],
            },
        },
        output: {
            ...options.output,
            // HMR 每次编译都会生成 manifest JSON 和更新 chunk。emit 前清理不再属于当前编译的文件，避免历史热更新文件持续堆积。
            // clean: true,
            clean: {
                keep: /i18n\//,
            },
        },
        // 仅开发环境注入 HMR 轮询入口；生产构建沿用 Nest 默认入口，避免生成的服务进程持续轮询热更新。
        entry: isDevelopment ? ['webpack/hot/poll?300', options.entry] : options.entry,
        externals: [
            nodeExternals({
                allowlist: isDevelopment ? ['webpack/hot/poll?300'] : [],
            }),
        ],
        plugins: [
            ...options.plugins,
            ...(isDevelopment
                ? [
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
                        // DEBUG_PORT 存在时以调试模式启动子进程（pnpm dev:debug）。
                        nodeArgs: process.env.DEBUG_PORT ? [`--inspect=${process.env.DEBUG_PORT}`] : [],
                        // 不在每次编译后强制重启，优先使用真正的模块热替换。
                        autoRestart: false,
                        // HMR 无法接受某些依赖图变化时，可在终端输入 rs 完整重启。
                        keyboard: true,
                    }),
                ]
                : []),
        ],
    };
};
