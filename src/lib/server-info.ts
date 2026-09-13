import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders, getRequestUrl } from '@tanstack/react-start/server'

/**
 * Reads the incoming HTTP request during SSR (or the RPC request when called
 * after client-side navigation). `@tanstack/react-start/server` is mocked in
 * the client bundle, so this import is only ever *used* on the server.
 */
export const getServerSnapshot = createServerFn({ method: 'GET' }).handler(
  async () => {
    const headers = getRequestHeaders()
    const url = getRequestUrl()

    return {
      renderedAt: new Date().toISOString(),
      pid: process.pid,
      node: process.version,
      platform: `${process.platform} ${process.arch}`,
      cwd: process.cwd(),
      uptimeSeconds: Math.round(process.uptime()),
      memoryRssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      appDataDir: process.env.APP_DATA_DIR ?? '(cwd)',
      request: {
        url: url.toString(),
        host: headers.get('host') ?? 'unknown',
        userAgent: headers.get('user-agent') ?? 'unknown',
        acceptLanguage: headers.get('accept-language') ?? 'unknown',
      },
    }
  },
)
