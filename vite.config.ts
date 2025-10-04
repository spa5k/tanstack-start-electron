import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart({
      srcDirectory: "src",
      start: { entry: "./start.tsx" },
      server: { entry: "./server.ts" },
    }),
    nitro({ config: { preset: "node-server" } }),
    viteReact(),
  ],
  optimizeDeps: {
    exclude: ["electron"],
  },
});
