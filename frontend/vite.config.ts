import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { resolve } from 'path';

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    cors: true,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    manifest: true, 
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'), 
        
        widget: resolve(__dirname, 'src/widget.jsx'),
      },
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'index.css') {
            return 'assets/index.css';
          }
          return `assets/[name].[ext]`;
        },
      },
    },
  },
});