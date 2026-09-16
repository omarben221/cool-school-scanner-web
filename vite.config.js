import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // accessible depuis un téléphone sur le même réseau WiFi
    port: 5175,
  },
});
