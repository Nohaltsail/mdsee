import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  root: '.',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true, // 端口被占用时直接报错，不自动切换
  },
})
