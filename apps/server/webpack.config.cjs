const nodeExternals = require('webpack-node-externals');

module.exports = function (options) {
  return {
    ...options,
    externals: [
      nodeExternals({
        // 将你的 workspace 命名空间加入白名单，这样 Webpack 就会把它们打包进 bundle，而不是保留 require()
        allowlist: [/^@workspace/],
      }),
    ], 
  }
}
