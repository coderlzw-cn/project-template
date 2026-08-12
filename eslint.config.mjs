import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['eslint.config.mjs', 'webpack.config.cjs', 'ecosystem.config.cjs', 'dist/**', 'coverage/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        projectService: true,
      },
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      // 防止 any 类型作为参数传递给函数，避免类型丢失扩散
      '@typescript-eslint/no-unsafe-argument': 'warn',

      // 允许在 catch 子句中使用 unknown 而不是隐式 any (结合 ES 规范)
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'warn',

      '@typescript-eslint/no-explicit-any': 'warn', // 使用 any 类型时给出警告，引导开发人员补充精确类型
      '@typescript-eslint/no-unsafe-assignment': 'warn', // 赋值给不安全类型时提示警告
      '@typescript-eslint/no-unsafe-member-access': 'warn', // 访问 any 类型变量的属性时提示警告
      '@typescript-eslint/no-non-null-assertion': 'error', // 严格禁止使用非空断言后缀操作符 ! (如 obj!.property)

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],

      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'group','groupEnd'] }], // 限制 console.log 滥用，仅保留 warn/error 允许打日志
      'no-debugger': 'error', // 生产环境代码严格禁止残留 debugger 调试断点
      eqeqeq: ['error', 'always'], // 强制全等比较，必须使用 === 和 !==，禁用双等号 ==
      'no-return-await': 'off', // 关闭原生规则，交由下方 TS 专用规则处理
      '@typescript-eslint/return-await': ['error', 'always'], // 强制在 async 函数内部正确对待 Promise 的 return 行为

      // ---------------- 异步逻辑与 Promise 安全 ----------------
      '@typescript-eslint/no-floating-promises': 'error', // 强制处理所有返回的 Promise（禁止“悬挂”未处理的异步任务）
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: false, // 允许在事件处理回调等 void 返回值的场景中直接传入返回 Promise 的函数
        },
      ],
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.test.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      'no-console': 'off',
    },
  },
);
