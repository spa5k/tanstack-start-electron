import { Await, ClientOnly, createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { ClientClock } from '~/components/client-clock'
import { Card, Skeleton } from '~/components/ui'
import { getSlowReport } from '~/lib/report'

export const Route = createFileRoute('/ssr')({
  loader: () => ({
    shellRenderedAt: new Date().toISOString(),
    // Deliberately NOT awaited: the loader returns a pending promise, so the
    // HTML shell can be flushed immediately and this resolves into the stream
    // about 1.5s later.
    report: getSlowReport(),
  }),
  component: SsrPage,
})

function SsrPage() {
  const { shellRenderedAt, report } = Route.useLoaderData()

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Streaming SSR</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          The HTML document is flushed before the slow part of this page is
          ready. Open DevTools → Network, reload, and watch the document
          response arrive in chunks. The shell timestamp below is already in
          the first chunk; the report streams in later.
        </p>
      </div>

      <Card eyebrow="Shell" title="Available in the first flushed chunk">
        <p className="font-mono text-sm text-cyan-200">{shellRenderedAt}</p>
      </Card>

      <Card eyebrow="Suspense boundary" title="Streamed in after ~1.5s">
        <Suspense fallback={<Skeleton lines={4} />}>
          <Await promise={report} fallback={<Skeleton lines={4} />}>
            {(data) => (
              <div>
                <p className="text-xs text-slate-500">
                  resolved in {data.elapsedMs}ms at {data.generatedAt}
                </p>
                <ul className="mt-4 space-y-2">
                  {data.rows.map((row) => (
                    <li key={row.label} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 text-xs text-slate-400">
                        {row.label}
                      </span>
                      <span
                        className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500"
                        style={{ width: `${row.value}%` }}
                      />
                      <span className="font-mono text-xs text-slate-300">
                        {row.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Await>
        </Suspense>
      </Card>

      <Card eyebrow="Client-only" title="What SSR must not try to render">
        <ClientOnly fallback={<Skeleton lines={1} />}>
          <ClientClock />
        </ClientOnly>
        <p className="mt-3 text-xs text-slate-500">
          <code className="font-mono">&lt;ClientOnly&gt;</code> keeps
          browser-only values out of the server render, which is exactly what
          you want for <code className="font-mono">window.desktop</code> too.
        </p>
      </Card>
    </div>
  )
}
