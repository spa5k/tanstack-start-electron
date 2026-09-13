import { protocol, session } from 'electron'
import { getCookieHeader, storeSetCookies } from './cookies'
import type { FetchHandler } from './handler'

export const APP_SCHEME = 'app'
export const APP_URL = `${APP_SCHEME}://renderer/`

/**
 * The renderer loads from `app://renderer/`. A privileged custom scheme gives
 * the page a normal, secure origin, so fetch, modules, streaming and history
 * all work. No TCP port is opened.
 */

/** Call this before `app.whenReady()`. */
export function registerAppScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
        codeCache: true,
      },
    },
  ])
}

/** Call this after `app.whenReady()`, once per session. */
export function attachAppProtocol(
  fetch: FetchHandler,
  serverOrigin: string,
): void {
  session.defaultSession.protocol.handle(APP_SCHEME, async (request) => {
    const response = await fetch(toServerRequest(request, serverOrigin))

    const setCookies = response.headers.getSetCookie()
    if (setCookies.length > 0) storeSetCookies(setCookies)

    return response
  })
}

/**
 * The Start server normalizes URLs with `new URL(...)`, which fails for
 * custom schemes (their `origin` is `"null"`). Give the handler a plain HTTP
 * origin and rewrite the origin-dependent headers to match, so the CSRF
 * middleware still sees a same-origin request.
 */
function toServerRequest(request: Request, serverOrigin: string): Request {
  const url = new URL(request.url)
  const target = new URL(`${url.pathname}${url.search}`, serverOrigin)

  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.set('origin', serverOrigin)

  // Chromium sends no cookies for `app://`, so use the jar from cookies.ts.
  if (!headers.has('cookie')) {
    const cookieHeader = getCookieHeader()
    if (cookieHeader) headers.set('cookie', cookieHeader)
  }

  const referer = headers.get('referer')
  if (referer) {
    try {
      const parsed = new URL(referer)
      headers.set('referer', `${serverOrigin}${parsed.pathname}${parsed.search}`)
    } catch {
      headers.delete('referer')
    }
  }

  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers,
    redirect: 'manual',
  }

  if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
    init.body = request.body
    init.duplex = 'half'
  }

  return new Request(target, init)
}
