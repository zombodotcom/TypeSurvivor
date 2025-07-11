// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: './index.html'
    }
  },
  server: {
    host: true,
    port: 5173
  }
})