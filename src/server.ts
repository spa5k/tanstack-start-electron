import handler, { createServerEntry } from '@tanstack/react-start/server-entry'

/**
 * Optional custom server entry.
 *
 * TanStack Start generates an equivalent entry when this file is absent. It is
 * included here as the documented hook for request-scoped concerns: request
 * context, middleware, logging, auth, feature flags, or swapping in srvx's
 * `FastResponse` for a small throughput win on Node.
 *
 * Nitro builds this file into `.output/server/index.mjs`, which the Electron
 * main process spawns as an in-process-per-app Node server.
 */
export default createServerEntry({
  fetch(request) {
    return handler.fetch(request)
  },
})
