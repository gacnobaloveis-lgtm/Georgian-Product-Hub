import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDev =
  process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined;

const devPlugins: any[] = [];
if (isDev) {
  try {
    const runtimeErrorOverlay = (
      await import("@replit/vite-plugin-runtime-error-modal")
    ).default;
    devPlugins.push(runtimeErrorOverlay());
    const { cartographer } = await import(
      "@replit/vite-plugin-cartographer"
    );
    devPlugins.push(cartographer());
    const { devBanner } = await import("@replit/vite-plugin-dev-banner");
    devPlugins.push(devBanner());
  } catch (e) {
    console.warn("Replit dev plugins unavailable:", (e as Error).message);
  }
}

export default defineConfig({
  plugins: [react(), ...devPlugins],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
