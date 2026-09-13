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
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
          Streaming SSR
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          The server sends this document before the slow part is ready. Open
          DevTools, select Network and reload. The document arrives in chunks.
          The shell timestamp is in the first chunk. The report arrives later.
        </p>
      </div>

      <Card eyebrow="Shell" title="Sent in the first chunk">
        <p className="font-mono text-sm text-neutral-900">{shellRenderedAt}</p>
      </Card>

      <Card eyebrow="Suspense boundary" title="Streamed in after about 1.5s">
        <Suspense fallback={<Skeleton lines={4} />}>
          <Await promise={report} fallback={<Skeleton lines={4} />}>
            {(data) => (
              <div>
                <p className="text-xs text-neutral-500">
                  resolved in {data.elapsedMs}ms at {data.generatedAt}
                </p>
                <ul className="mt-4 space-y-2">
                  {data.rows.map((row) => (
                    <li key={row.label} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 text-xs text-neutral-500">
                        {row.label}
                      </span>
                      <span
                        className="h-2 bg-neutral-800"
                        style={{ width: `${row.value}%` }}
                      />
                      <span className="font-mono text-xs text-neutral-700">
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

      <Card eyebrow="Client-only" title="What SSR must not render">
        <ClientOnly fallback={<Skeleton lines={1} />}>
          <ClientClock />
        </ClientOnly>
        <p className="mt-3 text-xs text-neutral-500">
          <code className="font-mono">&lt;ClientOnly&gt;</code> keeps
          browser-only values out of the server render. Use the same pattern
          for <code className="font-mono">window.desktop</code>.
        </p>
      </Card>
    </div>
  )
}
