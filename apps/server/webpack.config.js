const transformer = require('@nestjs/swagger/plugin');
const nodeExternals = require('webpack-node-externals');

/**
 * 导出一个函数以接收 NestJS CLI 的默认 options
 */
module.exports = function (options) {
  return {
    ...options,

    // 1. 配置 externals (保留默认外部依赖逻辑，并添加白名单)
    externals: [
      nodeExternals({
        allowlist: [/^@myapp/], // 允许打包 @myapp 开头的包
      }),
    ],

    // 2. 配置 module rules (添加 Swagger 插件的 ts-loader 规则)
    module: {
      // 使用 options.module.rules 如果存在，否则初始化为空数组
      rules: [
        ...(options.module?.rules || []),
        {
          test: /\.ts$/,
          loader: 'ts-loader',
          options: {
            // 这里的关键是注入 Swagger 插件
            getCustomTransformers: (program) => ({
              before: [
                transformer.before(
                  {
                    classValidatorShim: true,
                    introspectComments: true,
                    dtoFileNameSuffix: ['.dto.ts', '.entity.ts'],
                  },
                  program,
                ),
              ],
            }),
          },
        },
      ],
    },
  };
};
