import handler, { createServerEntry } from '@tanstack/react-start/server-entry'

/**
 * Optional custom server entry. Start generates an equal entry when this file
 * is absent. Use it for request context, middleware, logging, or auth.
 * Nitro builds it into `.output/server/index.mjs`.
 */
export default createServerEntry({
  fetch(request) {
    return handler.fetch(request)
  },
})
