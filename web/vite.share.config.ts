import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "path";

// Builds the standalone, self-contained share page (web/share/index.html) into
// a single HTML file with all JS and CSS inlined, so an exported conversation
// works with no server. The conversation JSON is injected at export time into
// the "__CLAUDE_RUN_SHARE_DATA__" placeholder (see web/utils.ts buildShareHtml).
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  root: resolve(__dirname, "share"),
  base: "./",
  resolve: {
    alias: {
      "@claude-run/api": resolve(__dirname, "../api/storage.ts"),
    },
  },
  build: {
    outDir: resolve(__dirname, "../dist/share"),
    emptyOutDir: true,
  },
});
