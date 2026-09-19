import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // Tests never need Tailwind's PostCSS pipeline, and loading
  // postcss.config.mjs makes Vite reject the string-form plugin entry.
  css: { postcss: { plugins: [] } },
  test: { environment: 'jsdom', globals: true },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
