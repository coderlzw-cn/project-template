// @ts-check
import eslintjs from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import turboPlugin from 'eslint-plugin-turbo';

export const globalIgnoresReg = globalIgnores(['dist', 'eslint.config.mjs']);

export const baseConfig = [
  turboPlugin.configs['flat/recommended'],
  eslintjs.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
];
