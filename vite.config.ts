/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Auto-copy sql-wasm.wasm to public directory on startup/build
try {
  const publicDir = path.resolve(__dirname, 'public')
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }
  const wasmSrc = path.resolve(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm')
  const wasmDest = path.resolve(publicDir, 'sql-wasm.wasm')
  if (fs.existsSync(wasmSrc)) {
    fs.copyFileSync(wasmSrc, wasmDest)
  }
} catch (err) {
  console.warn('Could not copy sql-wasm.wasm:', err)
}

const reactPath = path.resolve(__dirname, 'node_modules/react')
const reactDomPath = path.resolve(__dirname, 'node_modules/react-dom')

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    port: 5173,
    host: true,
  },

  resolve: {
    alias: {
      react: reactPath,
      'react-dom': reactDomPath,
    },
    dedupe: ['react', 'react-dom'],
  },

  // Force Vite to pre-bundle react once, preventing multiple instances
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
    ],
    exclude: ['sql.js'],
  },

  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep react and react-dom always together in one shared chunk
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router')
          ) {
            return 'react-vendor'
          }
          if (id.includes('@tanstack/react-query')) return 'query-vendor'
          if (id.includes('zustand')) return 'state-vendor'
          if (id.includes('lucide-react') || id.includes('driver.js')) return 'ui-vendor'
        },
      },
    },
  },

  // @ts-ignore — vitest injects this via /// <reference types="vitest" />
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
    ],
    exclude: ['node_modules', 'dist'],
  },
})
