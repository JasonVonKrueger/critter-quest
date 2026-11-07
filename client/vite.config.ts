import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
const proxy = {
  '/socket.io': { target: 'http://localhost:3001', ws: true },
  '/api': 'http://localhost:3001',
};
export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    injectRegister: null,
    includeAssets: ['icons/*.png', 'icons/bunny.svg'],
    manifest: {
      id: '/', name: 'Critter Quest', short_name: 'Critter Quest',
      description: 'Grow, share, and care for critters in a cooperative adventure for two.',
      lang: 'en', start_url: '/', scope: '/', display: 'standalone', orientation: 'portrait',
      theme_color: '#79965f', background_color: '#f7f8ef',
      categories: ['games', 'kids'],
      icons: [
        {src:'/icons/icon-192.png', sizes:'192x192', type:'image/png', purpose:'any'},
        {src:'/icons/icon-512.png', sizes:'512x512', type:'image/png', purpose:'any'},
        {src:'/icons/maskable-512.png', sizes:'512x512', type:'image/png', purpose:'maskable'},
      ],
    },
    workbox: {
      maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      globPatterns: ['**/*.{js,css,html,png,svg,json,webmanifest}'],
      navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/socket\.io(?:\/|$)/],
      cleanupOutdatedCaches: true,
      // Cache only the build shell; multiplayer and all API traffic stay live.
    },
    devOptions: { enabled: false },
  })],
  server: { proxy },
  preview: { proxy },
});
