import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "assets",
    emptyOutDir: false, // don't wipe other plugin assets
    rollupOptions: {
      input: path.resolve(__dirname, "src/main.jsx"),
      output: {
        entryFileNames: "flooring-calculator.js",
        chunkFileNames: "flooring-calculator.[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css")) {
            return "flooring-calculator.css";
          }
          return "flooring-calculator.[ext]";
        },
      },
    },
  },
});
