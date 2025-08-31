// vite.widget.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist-widget',
    lib: {
      //
      //  THIS IS THE LINE YOU MUST FIX
      //  Change 'src/main.jsx' to your actual entry file name
      //
      entry: path.resolve(__dirname, 'src/widget.jsx'), // <-- EXAMPLE: if your file is widget.jsx
      name: 'LyzrWidget',
      fileName: 'lyzr-widget',
      formats: ['umd'],
    },
    rollupOptions: {
      output: {
        entryFileNames: 'widget.js',
        assetFileNames: 'widget.css',
      },
    },
  },
});