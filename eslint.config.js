import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  // Ignore built artifacts
  {
    ignores: ['**/dist/**', '**/node_modules/**', 'backend/drizzle/**'],
  },

  // Base JS rules for all files
  js.configs.recommended,

  // TypeScript backend
  {
    files: ['backend/src/**/*.ts'],
    extends: [tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: './backend/tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // React frontend
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        project: './frontend/tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // not needed with react-jsx transform
    },
  },

  // Root-level config/script TS files
  {
    files: ['*.ts', 'scripts/**/*.{js,mjs}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.es2022 },
    },
  },

  // Disable formatting rules that conflict with Prettier (applies globally)
  prettierConfig,
);
