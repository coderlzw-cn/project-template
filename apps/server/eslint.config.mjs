// import nest from '@workspace/eslint/nest';

// /** @type {import("eslint").Linter.Config} */
// export default nest;

import globals from 'globals';
import { defineConfig } from 'eslint/config';
import { baseConfig, globalIgnoresReg } from './base.js';

export default defineConfig([
    globalIgnoresReg,
    {
        ignores: ['webpack.config.cjs']
    },
    ...baseConfig,
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },
            sourceType: 'commonjs',
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-floating-promises': 'warn',
            '@typescript-eslint/no-unsafe-argument': 'warn',
            "turbo/no-undeclared-env-vars": "off",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    "vars": "all",
                    "args": "after-used",
                    "ignoreRestSiblings": true,
                    // 关键配置：使用正则匹配下划线开头的名称
                    "varsIgnorePattern": "^_",
                    "argsIgnorePattern": "^_",
                    "destructuredArrayIgnorePattern": "^_",
                    "caughtErrorsIgnorePattern": "^_"
                }
            ]
        },
    }
])
