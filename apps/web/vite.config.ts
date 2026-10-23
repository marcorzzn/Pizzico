// Pizzico — apps/web/vite.config.ts
// Riferimento manifesto: §3.1, §3.2, §11 Step 3
// Licenza: MIT OR Apache-2.0

import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: 'localhost',
    port: 5173,
    hmr: {
      clientPort: 5173,
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: [
      '@pizzico/worker-core',
      '@pizzico/ui-web',
      '@pizzico/ui-kit',
      '@pizzico/command-palette',
      '@pizzico/shared',
    ],
  },
  build: {
    target: 'esnext',
  },
});
