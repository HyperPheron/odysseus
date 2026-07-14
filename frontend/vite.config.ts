/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 1420,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    execArgv: ['--no-experimental-webstorage'],
    exclude: ['e2e', 'node_modules'],
    coverage: {
      provider: 'v8',
      include: ['src/panel-grid/**/*.ts'],
      exclude: ['src/panel-grid/**/*.test.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
