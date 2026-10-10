import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts: ["founder-lettuce-overspend.ngrok-free.dev"],
    proxy: {
      "/api": "http://backend:4000",
      "/screenshots": "http://backend:4000"
    }
  },
  test: {
    globals: true,
    environment: "node"
  }
});
