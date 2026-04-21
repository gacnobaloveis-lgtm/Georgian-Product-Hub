import { build } from "esbuild";
import { execSync } from "child_process";

// Build the client with Vite
console.log("Building client...");
execSync("vite build", { stdio: "inherit" });

// Bundle the server entry point to dist/index.cjs
console.log("Building server...");
await build({
  entryPoints: ["server/index.ts"],
  outfile: "dist/index.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  packages: "external",
});

console.log("Build complete.");
