import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import { baseConfig, globalIgnoresReg } from './base.js'

export default defineConfig([
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      ...baseConfig,
    ],
  },
  globalIgnoresReg,
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        // project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  }
  // {
  //   files: ['**/*.{ts,tsx}'],
  //   extends: [
  //     ...baseConfig,
  //     // eslintjs.configs.recommended,
  //     // tseslint.configs.recommended,
  //     // reactHooks.configs.flat.recommended,
  //     // reactRefresh.configs.vite,
  //   ],
  //   languageOptions: {
  //     ecmaVersion: 2020,
  //     globals: globals.browser,
  //   },
  // }
])
