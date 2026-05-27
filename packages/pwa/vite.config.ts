import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'FieldOps Técnico',
        short_name: 'FieldOps',
        description: 'FieldOps — aplicativo para técnicos de campo',
        theme_color: '#1e40af',
        icons: [],
      },
    }),
  ],
});
