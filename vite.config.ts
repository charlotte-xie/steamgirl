import { defineConfig } from 'vite'

// @ts-ignore - vitest types will be available after installation
export default defineConfig(() => ({
  base: './',
  server: {
    port: 3000,
  },
  test: {
    globals: true,
    environment: 'node',
  },
}))
