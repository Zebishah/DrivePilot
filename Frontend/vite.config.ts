import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // zod 3.25+ moved entry; some deps still resolve to lib/index.mjs
      "zod/lib/index.mjs": path.resolve(
        __dirname,
        "node_modules/zod/index.js"
      ),
    },
  },
  optimizeDeps: {
    include: ["lucide-react"],
  },
});
