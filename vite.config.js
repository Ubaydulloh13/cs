import { gameApi } from "./server/dev-plugin.js";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { sites } from "@openai/sites-vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), sites(), gameApi()],
  build: { chunkSizeWarningLimit: 650 },
});
