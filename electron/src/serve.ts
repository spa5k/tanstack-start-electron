/**
 * Child process entry for the loopback HTTP mode.
 *
 * tsup bundles this file to `build/serve.cjs`. The main process starts it with
 * `ELECTRON_RUN_AS_NODE=1` and passes the handler path in APP_SERVER_ENTRY.
 * `srvx` turns the fetch handler into an HTTP server.
 */
import { pathToFileURL } from 'node:url'
import { serve } from 'srvx'
import type { FetchHandler } from './handler'

async function main(): Promise<void> {
  const entry = process.env.APP_SERVER_ENTRY
  if (!entry) throw new Error('APP_SERVER_ENTRY is required')

  const module = (await import(pathToFileURL(entry).href)) as {
    default: { fetch: FetchHandler }
  }

  const port = Number(process.env.PORT ?? 3000)
  const hostname = process.env.HOST ?? '127.0.0.1'

  serve({ port, hostname, fetch: module.default.fetch })
  console.log(`SSR server listening on http://${hostname}:${port}/`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
