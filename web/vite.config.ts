/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      workbox: {
        // Force new SW to activate immediately without waiting for old tabs to close
        skipWaiting: true,
        clientsClaim: true,
        // Remove outdated caches from previous builds
        cleanupOutdatedCaches: true,
        // Don't cache the main HTML — always fetch it fresh from network
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/pitayacore\.pitayacode\.io\/api\//,
            handler: 'NetworkOnly',
          }
        ]
      },
      manifest: {
        name: 'PitayaCore AI - Operaciones',
        short_name: 'PitayaCore',
        description: 'Plataforma de IA para la Gestión Acuícola',
        theme_color: '#003B71',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    headers: {
      'ngrok-skip-browser-warning': 'true'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:2014',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:2014',
        ws: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './setupTests.ts',
  },
})
