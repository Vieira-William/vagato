import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { fileURLToPath, URL } from 'url'

// https://vite.dev/config/
export default defineConfig({
  build: {
    // Source maps são obrigatórios para o Sentry mapear erros de produção
    sourcemap: true,
  },
  optimizeDeps: {
    // @mercadopago/sdk-react não tem exports ESM completos — forçar pré-bundle no dev
    include: ['@mercadopago/sdk-react'],
  },
  plugins: [
    react(),
    // Sentry plugin: faz upload de source maps no build (só funciona com SENTRY_AUTH_TOKEN)
    sentryVitePlugin({
      org: process.env.SENTRY_ORG || 'vagas-ux',
      project: process.env.SENTRY_PROJECT || 'vagas-frontend',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // Deletar .map files após upload para não expô-los em produção
      sourcemaps: {
        filesToDeleteAfterUpload: ['./dist/**/*.map'],
      },
      // Não interromper o build se não tiver auth token (ex: em dev)
      silent: true,
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL('./src', import.meta.url)),
      // @mercadopago/sdk-react não tem campo "exports" — apontar diretamente para o ESM
      // evita que Rollup 4 tente resolver via "main" (CJS) e falhe
      "@mercadopago/sdk-react": fileURLToPath(new URL('./node_modules/@mercadopago/sdk-react/esm/index.js', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    hmr: {
      overlay: false
    },
    watch: {
      usePolling: true,
      interval: 500,
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: true,
  }
})
