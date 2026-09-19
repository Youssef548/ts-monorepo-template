import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import { defineConfig } from '@app/eslint-config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  // importRules: false — eslint-config-next already registers a plugin under the
  // key `import`, and redefining that key makes ESLint throw.
  ...defineConfig({ type: 'app-web', importRules: false }),
  {
    files: ['**/*.{ts,tsx}'],
    // Re-enabled here because the plugin is already registered for these files
    // by the Next preset above.
    rules: { 'import/no-extraneous-dependencies': 'error' },
  },
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'build/**', 'next-env.d.ts'],
  },
];

export default eslintConfig;
