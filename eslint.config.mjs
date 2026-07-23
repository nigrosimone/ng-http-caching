// eslint.config.mjs

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier/flat';

export default tseslint.config(
  {
    // `examples/` holds standalone apps with their own package.json and tsconfig:
    // they are built on their own, not by this workspace.
    ignores: ['dist/**', 'coverage/**', '.angular/**', 'out-tsc/**', 'examples/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      ...angular.configs.tsRecommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      // This library is built around Angular's `HttpRequest<any>` / `HttpResponse<any>`
      // signatures, so `any` flows through it by design.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
  {
    files: ['projects/ng-http-caching/**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'ng', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'ng', style: 'kebab-case' },
      ],
    },
  },
  {
    files: ['projects/ng-http-caching-demo/**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
    },
  },
  {
    // Reaching into private members and declaring no-op stubs is normal in tests.
    files: ['**/*.spec.ts', '**/test-setup.ts'],
    rules: {
      '@typescript-eslint/dot-notation': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended],
  },
  // Must stay last: turns off every rule that conflicts with Prettier.
  prettier,
);
