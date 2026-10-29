import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base: the built app works from any folder, including HA's /local/.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 5173 },
});
