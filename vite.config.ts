import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-512.png', 'samples/*.jpg'],
      manifest: {
        name: 'Meitu Studio AI — แอพแต่งรูป & รีทัชบิวตี้ครบวงจร',
        short_name: 'Meitu Studio',
        description:
          'All-in-one Meitu-inspired AI photo editor, 478-point face reshape, makeup studio, 40+ filters, HSL, curves, cutout, collage & live beauty camera.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: './icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,woff2}'],
      },
    }),
  ],
});
