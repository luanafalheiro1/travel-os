import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relativa para funcionar em luanafalheiro1.github.io/travel-os/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { chunkSizeWarningLimit: 900 },
})
