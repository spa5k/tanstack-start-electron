import { createFileRoute } from '@tanstack/react-router'

/**
 * A plain HTTP endpoint, colocated with the UI routes. The Electron main
 * process polls this route to know when the production SSR server is ready.
 */
export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          {
            ok: true,
            service: 'tanstack-start-ssr',
            pid: process.pid,
            node: process.version,
            uptimeSeconds: Math.round(process.uptime()),
            time: new Date().toISOString(),
          },
          { headers: { 'cache-control': 'no-store' } },
        ),
    },
  },
})
