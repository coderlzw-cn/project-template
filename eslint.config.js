import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";
import pluginQuery from "@tanstack/eslint-plugin-query";
export default defineConfig([
  globalIgnores(["dist"]),
  ...pluginQuery.configs["flat/recommended"],
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
     rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_', // 忽略以下划线开头的函数参数。
          varsIgnorePattern: '^_', // 忽略以下划线开头的局部变量。
          caughtErrorsIgnorePattern: '^_', // 忽略 catch 块中以下划线开头的错误对
          ignoreRestSiblings: true, // 忽略在解构赋值（Rest Properties）时产生的未使用变量。
        }
      ]
    }
  },
]);
