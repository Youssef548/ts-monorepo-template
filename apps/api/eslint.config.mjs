import tseslint from 'typescript-eslint';
import { defineConfig } from '@app/eslint-config';

export default tseslint.config(
  { ignores: ['eslint.config.mjs', 'dist/**', 'coverage/**'] },
  ...tseslint.configs.recommended,
  ...defineConfig({ type: 'app-api' }),
);
