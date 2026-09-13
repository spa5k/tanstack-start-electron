import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import rsc from '@vitejs/plugin-rsc'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  // Electron loads the renderer from exactly this origin during development.
  server: {
    port: 3000,
    strictPort: true,
  },
  resolve: {
    // Read the `~/*` alias straight out of tsconfig.json.
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),

    // File-based routing, SSR, server functions, server routes.
    tanstackStart({
      srcDirectory: 'src',
      rsc: {
        // Experimental React Server Components support.
        enabled: true,
      },
    }),

    // The RSC (Flight) plugin. Must be registered after tanstackStart().
    rsc(),

    // React's Vite plugin must come after Start's plugin.
    viteReact(),

    // Emits `.output/server/index.mjs` (a fetch handler) plus
    // `.output/public`. Electron calls the handler in-process, so production
    // needs no open port. The `standard` preset exports the handler;
    // `serveStatic: true` keeps asset serving inside the bundle.
    nitro({
      preset: 'standard',
      serveStatic: true,
    }),
  ],
})
