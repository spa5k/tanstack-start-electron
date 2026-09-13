/**
 * A small cookie jar for the `app://` scheme.
 *
 * Chromium refuses cookies for custom schemes ("scheme that does not support
 * cookies"), so the protocol layer keeps its own jar. It adds a `Cookie`
 * header to each server request and stores `Set-Cookie` values from each
 * response. This keeps cookie-based server sessions working.
 *
 * The jar is per app origin and ignores Domain and Path rules, which is
 * correct for a single-origin desktop app.
 */

interface StoredCookie {
  name: string
  value: string
  /** Epoch milliseconds, or null for a session cookie. */
  expiresAt: number | null
}

const cookies = new Map<string, StoredCookie>()

function prune(): void {
  const now = Date.now()
  for (const [name, cookie] of cookies) {
    if (cookie.expiresAt !== null && cookie.expiresAt <= now) {
      cookies.delete(name)
    }
  }
}

/** Returns a `Cookie` header value, or null when the jar is empty. */
export function getCookieHeader(): string | null {
  prune()
  if (cookies.size === 0) return null
  return [...cookies.values()]
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ')
}

/** Applies the `Set-Cookie` headers of a response to the jar. */
export function storeSetCookies(setCookies: Array<string>): void {
  for (const line of setCookies) {
    const [nameValue = '', ...attributes] = line.split(';')
    const separator = nameValue.indexOf('=')
    if (separator < 1) continue

    const name = nameValue.slice(0, separator).trim()
    const value = nameValue.slice(separator + 1).trim()

    let expiresAt: number | null = null
    let remove = value === ''

    for (const attribute of attributes) {
      const [rawKey = '', ...rawValue] = attribute.split('=')
      const key = rawKey.trim().toLowerCase()
      const attributeValue = rawValue.join('=').trim()

      if (key === 'max-age') {
        const seconds = Number(attributeValue)
        if (Number.isFinite(seconds)) {
          if (seconds <= 0) remove = true
          else expiresAt = Date.now() + seconds * 1_000
        }
      } else if (key === 'expires') {
        const time = Date.parse(attributeValue)
        if (!Number.isNaN(time)) {
          if (time <= Date.now()) remove = true
          else expiresAt = time
        }
      }
    }

    if (remove) cookies.delete(name)
    else cookies.set(name, { name, value, expiresAt })
  }
}
