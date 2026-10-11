import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const server = 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': server,
      '/images/paintings': server,
      '/images/artists': server,
      '/uploads': server,
    },
  },
  preview: {
    port: 4173,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
});
