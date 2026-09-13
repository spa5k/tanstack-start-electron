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
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <div>
          <h1
            className="text-xl font-semibold tracking-tight text-neutral-900"
            data-testid="hero-heading"
          >
            A full-stack React framework in a desktop shell
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            This HTML was rendered by a Node process that Electron started,
            then hydrated in Chromium. Server functions and Server Components
            run in that same process.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill>SSR</Pill>
            <Pill>Streaming</Pill>
            <Pill>RSC</Pill>
            <Pill>IPC</Pill>
          </div>
        </div>

        <Card eyebrow="Server snapshot" title="What the SSR process sees">
          <dl>
            <KeyValue label="rendered at" value={snapshot.renderedAt} />
            <KeyValue label="pid" value={snapshot.pid} />
            <KeyValue label="node" value={snapshot.node} />
            <KeyValue label="runtime" value={snapshot.runtime} />
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
          <p className="mt-3 text-xs text-neutral-500">
            Press ⌘R or Ctrl+R. The server computes all values again.
          </p>
        </Card>
      </div>

      <div className="space-y-6">
        <DesktopPanel />

        <Card eyebrow="Lifecycle" title="Request lifecycle">
          <ol className="list-decimal space-y-2 pl-4">
            <li>
              In production, Electron imports the built handler into the main
              process and serves the app from{' '}
              <code className="font-mono text-xs">app://renderer/</code>. No
              port is opened.
            </li>
            <li>
              The Start server renders the route tree to HTML. It streams each
              Suspense boundary as it resolves.
            </li>
            <li>
              Server functions run in-process during SSR. In the browser they
              become typed RPC calls.
            </li>
            <li>
              The preload script exposes a frozen{' '}
              <code className="font-mono text-xs">window.desktop</code> API
              over <code className="font-mono text-xs">contextBridge</code>.
            </li>
          </ol>
        </Card>
      </div>
    </div>
  )
}
