// @ts-check
import tseslint from 'typescript-eslint';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default tseslint.config(
  // ── Ignored paths ────────────────────────────────────────────────────────
  {
    ignores: [
      'node_modules/**',
      'main.js',          // esbuild bundle output
      'coverage/**',
    ],
  },

  // ── Obsidian recommended rules ────────────────────────────────────────────
  // Same ruleset the Obsidian automated reviewer runs — catches violations
  // before submission. Applied globally; our later config blocks override
  // any rule severity that conflicts with our project conventions.
  ...obsidianmd.configs.recommended,

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

      // obsidianmd/recommended sets this as error; downgrade because Obsidian's
      // own types deprecate things we can't avoid at minAppVersion 1.7.0.
      '@typescript-eslint/no-deprecated': 'warn',

      // We use `instanceof TFile/TFolder` for vault event guards — safe in
      // single-window desktop contexts. The cross-window instanceOf helper is
      // undocumented in the public Obsidian API, so this rule is turned off.
      'obsidianmd/prefer-instanceof': 'off',

      // i18n.ts reads window.localStorage to detect the app's display language
      // (the 'language' key is written by Obsidian itself, not this plugin).
      // This is reading Obsidian's own setting, not storing plugin data.
      'obsidianmd/prefer-get-language': 'off',

      // restrict-template-expressions flags number/boolean in template literals.
      // Downgrade to warn — we intentionally format counts in Notice messages.
      '@typescript-eslint/restrict-template-expressions': 'warn',

      // unbound-method: we always call methods via `this.x()` or arrow wrappers.
      '@typescript-eslint/unbound-method': 'warn',
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

      // Obsidianmd rules that conflict with test/mock patterns
      'obsidianmd/no-global-this': 'off',          // tests/setup.ts uses globalThis
      'obsidianmd/prefer-window-timers': 'off',    // tests run in Node.js
      'obsidianmd/prefer-get-language': 'off',
      'obsidianmd/prefer-instanceof': 'off',
      'obsidianmd/validate-manifest': 'off',
      'obsidianmd/validate-license': 'off',
      'obsidianmd/ui/sentence-case': 'off',
      'obsidianmd/sample-names': 'off',
      'obsidianmd/no-sample-code': 'off',
      'import/no-extraneous-dependencies': 'off',  // vitest is devDependency
      'no-restricted-globals': 'off',
    },
  },
);
