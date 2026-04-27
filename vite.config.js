import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // MediaPipe bundles its own WASM loader — skip Vite pre-bundling
    exclude: ['@mediapipe/tasks-vision'],
  },
})
