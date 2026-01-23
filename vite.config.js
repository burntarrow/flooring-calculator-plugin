import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Output to a 'build' folder instead of 'dist' to match your WP plugin structure
    outDir: 'build',
    // Generate a manifest.json (optional, but good for debugging)
    manifest: true,
    rollupOptions: {
      output: {
        // Force consistent filenames so WordPress PHP can always find them
        // (prevents index-234234.js style hashing)
        entryFileNames: 'assets/flooring-calculator.js',
        assetFileNames: 'assets/flooring-calculator.[ext]',
      },
    },
  },
})
