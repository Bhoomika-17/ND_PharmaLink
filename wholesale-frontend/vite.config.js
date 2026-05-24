import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Nirmal & Durga Wholesale',
        short_name: 'Wholesale',
        description: 'B2B Wholesale Partner Portal',
        theme_color: '#1e40af', // Tailwind blue-800
        background_color: '#ffffff',
        display: 'standalone', // This makes it look like a native app (hides browser URL bar)
        icons: [
          {
            src: 'pwa-192x192.png', // You will need to drop a 192x192 logo in the public folder later
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png', // You will need to drop a 512x512 logo in the public folder later
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})