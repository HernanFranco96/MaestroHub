import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const proxyTarget =
  process.env.VITE_DEV_PROXY_TARGET || "http://localhost:3000";

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": { target: proxyTarget, changeOrigin: true },
      "/socket.io": { target: proxyTarget, changeOrigin: true, ws: true },
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  optimizeDeps: {
    include: ["echarts", "react-leaflet", "leaflet"],
  },
});
