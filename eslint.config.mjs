// @ts-check
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // ── Ignored paths ────────────────────────────────────────────────────────
  {
    ignores: [
      'node_modules/**',
      'main.js',          // esbuild bundle output
      'coverage/**',
    ],
  },

  // ── Source files: full TypeScript rules with type-aware checks ────────────
  {
    files: ['src/**/*.ts'],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Downgrade to warn — Obsidian types and dynamic frontmatter require `any`
      '@typescript-eslint/no-explicit-any': 'warn',

      // Enforce underscore prefix convention for intentionally unused params/vars
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],

      // Floating promises should always be awaited or explicitly discarded
      '@typescript-eslint/no-floating-promises': 'error',

      // No `require()` in ESM source
      '@typescript-eslint/no-require-imports': 'error',

      // Allow `void` operator to discard promise results intentionally
      'no-void': ['error', { allowAsStatement: true }],

      // Prefer `const` where variable is never reassigned
      'prefer-const': 'error',

      // No `console.log` left in production code (console.warn/error are fine)
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Obsidian's processFrontMatter types the callback argument as `any`.
      // Downgrade unsafe-member-access/assignment to warn rather than disabling,
      // so genuinely risky patterns in other areas still get flagged.
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',

      // Obsidian Setting callbacks (onClick, onChange) are typed as () => void
      // but plugins routinely use async handlers. Allow async where void is expected
      // in callback arguments, but keep the check for return values of functions.
      '@typescript-eslint/no-misused-promises': ['error', {
        checksVoidReturn: { arguments: false },
      }],
    },
  },

  // ── Test & mock files: relaxed rules ─────────────────────────────────────
  {
    files: ['tests/**/*.ts', '__mocks__/**/*.ts', 'vitest.config.ts'],
    extends: [
      ...tseslint.configs.recommended,
    ],
    rules: {
      // Tests need `any` for mocks and spies
      '@typescript-eslint/no-explicit-any': 'off',

      // Underscore-prefixed params are intentional no-ops in mocks
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],

      // Test files routinely call async functions without awaiting
      '@typescript-eslint/no-floating-promises': 'off',

      'prefer-const': 'error',
    },
  },
);
