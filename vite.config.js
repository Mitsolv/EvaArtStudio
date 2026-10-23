import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa' // <--- ЭТА СТРОКА ВАЖНА

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({ // <--- И ЭТОТ БЛОК
      registerType: 'autoUpdate',
      manifest: {
        name: 'NailBook',
        short_name: 'NailBook',
        description: 'Запись на маникюр онлайн',
        theme_color: '#10b981',
        background_color: '#f0fdf4',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})