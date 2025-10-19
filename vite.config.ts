import { defineConfig } from "vite";
import path from "node:path";
import react from "@vitejs/plugin-react-swc";
import Inspect from "vite-plugin-inspect";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { visualizer } from "rollup-plugin-visualizer";
import { createHtmlPlugin } from "vite-plugin-html";
import viteCompression from "vite-plugin-compression";
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    Inspect(),
    tailwindcss(),
    viteCompression(),
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      sourcemap: true,
    }),
    basicSsl({
      /** name of certification */
      name: "test",
      /** custom trust domains */
      domains: ["*.example.com"],
      /** custom certification directory */
      certDir: path.resolve(__dirname, ".devServer/cert"),
    }),
    createHtmlPlugin({
      minify: true,
      inject: {
        data: {
          title: "vite-1111",
        },
      },
    }),
  ],
});
