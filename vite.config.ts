import { defineConfig, loadEnv } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import path from 'node:path';
// 检查插件：提供可视化界面查看Vite的插件钩子和模块转换过程，便于调试
import Inspect from 'vite-plugin-inspect';
// TailwindCSS插件：集成TailwindCSS工具，处理CSS类的生成和注入
import tailwindcss from '@tailwindcss/vite';
// SSL证书插件：自动生成SSL证书，支持本地HTTPS开发环境
import basicSsl from '@vitejs/plugin-basic-ssl';
// 打包分析插件：可视化展示打包后各模块的体积占比，帮助优化包体积
import { visualizer } from 'rollup-plugin-visualizer';
// HTML处理插件：用于简化HTML文件的处理，支持注入数据和压缩
import { createHtmlPlugin } from 'vite-plugin-html';
// 压缩插件：对打包后的静态资源进行压缩（如gzip/brotli），减小文件体积
import viteCompression from 'vite-plugin-compression';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
// React Dev Inspector 插件：用于在开发过程中检查React组件树和状态
import { inspectorServer } from '@react-dev-inspector/vite-plugin';

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // 加载当前环境（.env、.env.[mode]）的变量
  const env = loadEnv(mode, process.cwd());
  const isDevServer = command === 'serve';
  const isBuild = command === 'build';

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      ...(isDevServer ? [inspectorServer(), Inspect()] : []),
      // 集成TailwindCSS，自动处理配置文件和CSS类生成
      tailwindcss(),
      ...(isBuild
        ? [
            // 启用资源压缩，生成 .gz 文件
            viteCompression(),
            visualizer({
              open: false,
              gzipSize: true,
              brotliSize: true,
              sourcemap: false,
            }),
          ]
        : []),
      ...(isDevServer
        ? [
            basicSsl({
              name: 'test',
              domains: ['*.example.com'],
              certDir: path.resolve(import.meta.dirname, '.devServer/cert'),
            }),
          ]
        : []),
      // 配置HTML处理插件
      createHtmlPlugin({
        minify: true, // 启用HTML压缩
        inject: {
          data: {
            title: env.VITE_APP_TITLE, // 注入HTML模板的数据（如标题）
          },
        },
      }),
      ViteImageOptimizer({}),
    ],
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      open: true,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET,
          changeOrigin: true,
          // 参数命名为 urlPath，避免与顶部导入的 node:path 模块同名遮蔽
          rewrite: urlPath => urlPath.replace(/^\/api/, ''),
        },
      },
    },
    build: {
      // 关闭计算包体积（大型项目可节省时间）
      reportCompressedSize: false,
      rolldownOptions: {
        output: {
          // 按资源类型拆分不同目录
          chunkFileNames: 'js/[name]-[hash].js', // 代码分割的chunk文件
          entryFileNames: 'js/[name]-[hash].js', // 入口JS文件
          assetFileNames: assetInfo => {
            // 处理css文件
            if (assetInfo.name?.endsWith('.css')) {
              return 'css/[name]-[hash][extname]';
            }
            // 处理图片资源
            if (/\.(png|jpe?g|gif|svg|webp)/.test(assetInfo.name || '')) {
              return 'images/[name]-[hash][extname]';
            }
            // 处理字体资源
            if (/\.(woff2?|ttf|otf|eot)/.test(assetInfo.name || '')) {
              return 'fonts/[name]-[hash][extname]';
            }
            // 其他资源
            return 'media/[name]-[hash][extname]';
          },
        },
      },
    },
  };
});
