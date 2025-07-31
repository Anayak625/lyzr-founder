import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { resolve } from 'path';

export default defineConfig({
  // ... other settings like server, plugins ...
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
    // We don't need a manifest for the widget part, but it's fine for the main app
    manifest: true, 
    rollupOptions: {
      input: {
        // This is your main dashboard application
        main: resolve(__dirname, 'index.html'), 
        
        // This is your separate widget application
        widget: resolve(__dirname, 'src/widget.jsx'),
      },
      output: {
        // Define explicit output names for clarity
        // [name] will be 'main' or 'widget' based on the input key
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: (assetInfo) => {
          // Keep CSS for the widget named predictably
          if (assetInfo.name === 'widget.css') {
            return 'assets/widget.css';
          }
          return `assets/[name].[ext]`;
        },
      },
    },
  },
});