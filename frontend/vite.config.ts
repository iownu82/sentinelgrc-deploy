import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // amazon-cognito-identity-js was written for Node and references `global`.
  // Polyfill it to globalThis so the browser bundle works.
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    // Pre-bundle these so the dev server doesn't choke on their CommonJS shape.
    include: ['amazon-cognito-identity-js'],
  },
})
