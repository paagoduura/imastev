import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(() => ({
  base: "/",
  server: {
    host: "0.0.0.0",
    port: 5000,
    strictPort: false,
    allowedHosts: true,
    headers: {
      "Cross-Origin-Opener-Policy": "unsafe-none",
      "Cross-Origin-Embedder-Policy": "unsafe-none",
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  build: {
    outDir: "dist",
    cssMinify: "esbuild",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
