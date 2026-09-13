/**
 * Serves the production build on Node, without Electron.
 *
 * The `.output` bundle (Nitro `standard` preset) exports a fetch handler and
 * serves static assets from `.output/public`. `srvx` turns that handler into
 * an HTTP server.
 *
 * Usage: pnpm start:server
 */
import { serve } from 'srvx'
import handler from '../.output/server/index.mjs'

const port = Number(process.env.PORT ?? 3000)
const hostname = process.env.HOST ?? '127.0.0.1'

serve({
  port,
  hostname,
  fetch: handler.fetch,
})

console.log(`SSR server listening on http://${hostname}:${port}/`)
