import { defineConfig } from 'vite';
import path from 'node:path';
// React插件：用于处理React单文件组件和JSX语法，使用SWC进行快速编译
import react from '@vitejs/plugin-react';
// 检查插件：提供可视化界面查看Vite的插件钩子和模块转换过程，便于调试
import Inspect from 'vite-plugin-inspect';
// TailwindCSS插件：集成TailwindCSS工具，处理CSS类的生成和注入
import tailwindcss from '@tailwindcss/vite';
// SSL证书插件：自动生成SSL证书，支持本地HTTPS开发环境
// import basicSsl from '@vitejs/plugin-basic-ssl';
// 打包分析插件：可视化展示打包后各模块的体积占比，帮助优化包体积
import { visualizer } from 'rollup-plugin-visualizer';
// HTML处理插件：用于简化HTML文件的处理，支持注入数据和压缩
import { createHtmlPlugin } from 'vite-plugin-html';
// 压缩插件：对打包后的静态资源进行压缩（如gzip/brotli），减小文件体积
import viteCompression from 'vite-plugin-compression';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
// React Dev Inspector 插件：用于在开发过程中检查React组件树和状态
import { inspectorServer } from '@react-dev-inspector/vite-plugin';
// 
import tsconfigPaths from 'vite-tsconfig-paths'
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    //  ReactInspector(),
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler', '@react-dev-inspector/babel-plugin'],
      },
    }),
    inspectorServer(),
    // 启用插件检查器，可通过访问特定URL查看构建过程细节
    Inspect(),
    // 集成TailwindCSS，自动处理配置文件和CSS类生成
    tailwindcss(),
    // 启用资源压缩，默认生成.gz格式压缩文件
    viteCompression(),
    // 配置打包分析工具
    visualizer({
      open: false, // 打包完成后自动打开分析页面
      gzipSize: true, // 显示gzip压缩后的体积
      brotliSize: true, // 显示brotli压缩后的体积
      sourcemap: false, // 结合sourcemap展示更详细的模块信息
    }),
    // 配置本地HTTPS开发环境
    // basicSsl({
    //   name: 'test', // 证书名称
    //   domains: ['*.example.dev'], // 信任的域名（支持通配符）
    //   certDir: path.resolve(__dirname, '.devServer/cert'), // 证书存储目录
    // }),
    // 配置HTML处理插件
    createHtmlPlugin({
      minify: true, // 启用HTML压缩
      inject: {
        data: {
          title: 'vite-demo', // 注入HTML模板的数据（如标题）
        },
      },
    }),
    ViteImageOptimizer({}),
    tsconfigPaths()
  ],
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src'),
    },
    // extensions: ['.ts', '.tsx', '.jsx', '.js', '.json'],
  },
  server: {
    host: 'example.dev',
    port: 3000,
    open: false,
    https: {
      cert: path.resolve(__dirname, '.devServer/cert/example.dev.pem'),
      key: path.resolve(__dirname, '.devServer/cert/example.dev-key.pem'),
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
    watch: {
      // 缩小文件监听范围（排除 node_modules 等无需监听的目录）
      ignored: ['**/node_modules/**', '**/.git/**'],
    },
  },
  optimizeDeps: {
    // 指定需要优先预构建的依赖（减少二次预构建）
    include: ['react', 'react-dom'], // 高频依赖
    exclude: [], // 排除无法预构建的库
  },
  build: {
    sourcemap: false, // "hidden"
    // 关闭计算包体积（大型项目可节省时间）
    reportCompressedSize: false,
    // 使用 terser 压缩
    minify: 'terser',
    // 小于此阈值的资源转为 base64（减少 HTTP 请求）
    assetsInlineLimit: 4096, // 4KB
    rollupOptions: {
      output: {
        // 按资源类型拆分不同目录
        chunkFileNames: 'js/[name]-[hash].js', // 代码分割的chunk文件
        entryFileNames: 'js/[name]-[hash].js', // 入口JS文件
        assetFileNames: (assetInfo) => {
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
});
