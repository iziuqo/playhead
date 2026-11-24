import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Inside Figma Make the dev server must bind to the port and host Figma provides.
const inFigma = Boolean(process.env.FIGMA)

export default defineConfig({
  plugins: [react()],
  base: process.env.FIGMA_PUBLIC_URL ?? '/',
  server: {
    port: inFigma ? Number(process.env.PORT) : 5173,
    host: inFigma ? process.env.FIGMA_DEV_SERVER_HOST || '0.0.0.0' : undefined,
    strictPort: inFigma,
  },
  test: { include: ['src/**/*.test.ts'] },
})
