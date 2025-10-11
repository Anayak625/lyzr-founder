// vite.config.js

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  return {
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

    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
    },

    build: {
      manifest: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          widget: resolve(__dirname, 'src/widget.jsx'),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'widget') {
              return 'widget.js';
            }
            return 'assets/[name]-[hash].js';
          },
          chunkFileNames: `assets/[name]-[hash].js`,
          assetFileNames: (assetInfo) => {
            if (assetInfo.name === 'index.css') {
              return 'widget.css';
            }
            return 'assets/[name]-[hash].[ext]';
          },
        },
      },
    },
  };
});