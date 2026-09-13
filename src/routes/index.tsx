import { createFileRoute } from '@tanstack/react-router'
import { DesktopPanel } from '~/components/desktop-panel'
import { Card, KeyValue, Pill } from '~/components/ui'
import { getServerSnapshot } from '~/lib/server-info'

export const Route = createFileRoute('/')({
  // This loader runs during SSR and on client navigation. The server function
  // keeps the data access the same in both cases.
  loader: () => getServerSnapshot(),
  component: OverviewPage,
})

function OverviewPage() {
  const snapshot = Route.useLoaderData()

  return (
    <div className="grid gap-6 py-6 lg:grid-cols-2">
      <div className="space-y-6">
        <div>
          <h1
            className="text-2xl font-bold text-white"
            data-testid="hero-heading"
          >
            A full-stack React framework in a desktop shell
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            The renderer you are looking at was server-rendered by a Node
            process that Electron started, then hydrated in Chromium. Server
            functions and Server Components execute in that same process.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill tone="cyan">SSR</Pill>
            <Pill tone="emerald">Streaming</Pill>
            <Pill tone="violet">RSC</Pill>
            <Pill tone="amber">IPC</Pill>
          </div>
        </div>

        <Card
          eyebrow="Server snapshot"
          title="What the SSR process sees"
        >
          <dl>
            <KeyValue label="rendered at" value={snapshot.renderedAt} />
            <KeyValue label="pid" value={snapshot.pid} />
            <KeyValue label="node" value={snapshot.node} />
            <KeyValue label="platform" value={snapshot.platform} />
            <KeyValue label="uptime" value={`${snapshot.uptimeSeconds}s`} />
            <KeyValue label="rss" value={`${snapshot.memoryRssMb} MB`} />
            <KeyValue label="APP_DATA_DIR" value={snapshot.appDataDir} />
          </dl>
        </Card>

        <Card eyebrow="Request" title="Headers on the SSR request">
          <dl>
            <KeyValue label="url" value={snapshot.request.url} />
            <KeyValue label="host" value={snapshot.request.host} />
            <KeyValue
              label="accept-language"
              value={snapshot.request.acceptLanguage}
            />
            <KeyValue label="user-agent" value={snapshot.request.userAgent} />
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            Refresh the window (⌘R / Ctrl+R). Everything above is recomputed on
            the server, not in the browser.
          </p>
        </Card>
      </div>

      <div className="space-y-6">
        <DesktopPanel />

        <Card eyebrow="How it fits together" title="Request lifecycle">
          <ol className="list-decimal space-y-2 pl-4 text-sm text-slate-300">
            <li>
              In dev, Electron loads the Vite dev server. In production, it
              spawns <code className="font-mono text-cyan-200">.output/server/index.mjs</code>{' '}
              and loads that origin.
            </li>
            <li>
              The Start server renders the route tree to HTML, streaming
              Suspense boundaries as they resolve.
            </li>
            <li>
              Server functions are called in-process during SSR; from the
              browser they become typed RPC calls.
            </li>
            <li>
              The preload script exposes a frozen <code className="font-mono">window.desktop</code>{' '}
              API over <code className="font-mono">contextBridge</code>.
            </li>
          </ol>
        </Card>
      </div>
    </div>
  )
}
