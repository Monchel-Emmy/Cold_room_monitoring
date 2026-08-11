import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': process.env.VITE_API_URL
        ? process.env.VITE_API_URL.replace(/\/$/, '')
        : 'http://localhost:5001',
      '/socket.io': {
        target: process.env.VITE_API_URL
          ? process.env.VITE_API_URL.replace(/\/$/, '')
          : 'http://localhost:5001',
        ws: true,
      },
    },
  },
  preview: {
    port: 4173,
  },
  define: {
    __APP_MODE__: JSON.stringify(mode),
  },
}));
