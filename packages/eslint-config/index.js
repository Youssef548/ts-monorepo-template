import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import boundaries from 'eslint-plugin-boundaries';
import importPlugin from 'eslint-plugin-import';

// Two levels up from this file: packages/eslint-config -> packages -> repo root.
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * The boundary rules: apps never import each other, packages never import an
 * app, and the tooling packages stay build/lint-time only. Violations are
 * `error`, and `default: 'disallow'` means an edge nobody wrote a rule for
 * fails rather than passes.
 *
 * `packages/eslint-config/test/boundaries.test.ts` runs these rules against a
 * miniature fixture workspace and fails if any of them stops firing.
 *
 * @param {object} options
 * @param {string} options.type            'app-api' | 'app-web' | 'package'
 * @param {boolean} [options.importRules]  set false when the consuming flat
 *   config already registers a plugin under the key `import` (eslint-config-next
 *   does), because redefining that key makes ESLint throw. Such a consumer can
 *   still enable `import/no-extraneous-dependencies` in a rules-only config.
 * @param {string} [options.rootPath]      overrides PROJECT_ROOT; only the
 *   fixture workspace in this package's tests needs to.
 */
export function defineConfig({ type, importRules = true, rootPath = PROJECT_ROOT }) {
  const isApp = type.startsWith('app-');

  const elements = [
    { type: 'app', pattern: 'apps/*' },
    // Tooling packages get their own element type so nothing can import them.
    // They must be declared before the generic `packages/*` descriptor, because
    // the first matching descriptor wins. Expressing the exclusion this way
    // avoids depending on capture-pattern semantics entirely.
    { type: 'tooling', pattern: 'packages/config' },
    { type: 'tooling', pattern: 'packages/eslint-config' },
    { type: 'package', pattern: 'packages/*' },
  ];

  const rules = [
    {
      files: ['**/*.{ts,tsx}'],
      plugins: importRules ? { boundaries, import: importPlugin } : { boundaries },
      settings: {
        // Absolute, and this is load-bearing. The plugin resolves `include` and
        // `elements` against `process.cwd()` by default, but turbo runs each
        // package's lint script with cwd set to that package — so `apps/**`
        // matches nothing, no element is ever recognised, and every rule below
        // passes silently. An absolute root makes the rules independent of
        // where ESLint was invoked from.
        'boundaries/root-path': rootPath,
        'boundaries/include': ['apps/**', 'packages/**'],
        'boundaries/elements': elements,
        // Without an import resolver, eslint-module-utils falls back to the
        // node resolver without .ts/.tsx extensions, so extensionless relative
        // imports of TS files come back unresolved and boundaries silently
        // skips element-types checks on them.
        'import/resolver': { node: { extensions: ['.js', '.ts', '.tsx'] } },
      },
      rules: {
        'boundaries/element-types': [
          'error',
          {
            default: 'disallow',
            rules: [
              // An app may import packages. It may not import another app.
              { from: 'app', allow: ['package'] },
              // A package may import packages, but not an app and not tooling.
              { from: 'package', allow: ['package'] },
            ],
          },
        ],
        ...(importRules ? { 'import/no-extraneous-dependencies': 'error' } : {}),
      },
    },
  ];

  if (isApp) {
    rules.push({
      files: ['apps/*/src/**/*.{ts,tsx}'],
      // An import that resolves to no known element is a hole in the rules, so
      // make it loud rather than silent.
      rules: { 'boundaries/no-unknown': 'error' },
    });
  }

  return rules;
}
