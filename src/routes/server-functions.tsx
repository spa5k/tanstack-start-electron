import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, useTransition } from 'react'
import { Button, Card, KeyValue, Pill } from '~/components/ui'
import { getCounter, incrementCounter, resetCounter } from '~/lib/counter'

export const Route = createFileRoute('/server-functions')({
  loader: () => getCounter(),
  component: ServerFunctionsPage,
})

function ServerFunctionsPage() {
  const counter = Route.useLoaderData()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const run = (fn: () => Promise<unknown>) => {
    setError(null)
    startTransition(async () => {
      try {
        await fn()
        await router.invalidate()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause))
      }
    })
  }

  return (
    <div className="grid gap-6 py-6 lg:grid-cols-2">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Server functions</h1>
          <p className="mt-2 text-sm text-slate-400">
            Type-safe RPC with no API layer. The handler runs in the SSR
            process and writes a real file on disk; the client only sees a
            fetch-shaped stub.
          </p>
        </div>

        <Card eyebrow="Mutation" title="Filesystem-backed counter">
          <p
            className="text-5xl font-black text-cyan-300 tabular-nums"
            data-testid="counter-value"
          >
            {counter.value}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            last write: {counter.updatedAt ?? 'never'}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {[1, 3, 5].map((by) => (
              <Button
                key={by}
                disabled={isPending}
                onClick={() => run(() => incrementCounter({ data: { by } }))}
              >
                +{by}
              </Button>
            ))}
            <Button
              disabled={isPending}
              className="border-red-400/20 bg-red-400/10 text-red-200 hover:bg-red-400/20"
              onClick={() => run(() => resetCounter())}
            >
              reset
            </Button>
          </div>

          {isPending ? (
            <p className="mt-2 text-xs text-cyan-300">calling server fn…</p>
          ) : null}
          {error ? (
            <p className="mt-2 rounded-lg border border-red-400/30 bg-red-400/10 p-2 text-xs text-red-200">
              {error}
            </p>
          ) : null}

          <dl className="mt-4">
            <KeyValue label="storage" value={counter.storagePath} />
          </dl>
        </Card>

        <Card eyebrow="Validation" title="Zod runs on the server">
          <p>
            <code className="font-mono text-xs text-cyan-200">
              .validator(z.object({'{'} by: z.number().int().min(1).max(10) {'}'}))
            </code>{' '}
            rejects bad payloads before your handler runs. The <em>same types</em>{' '}
            flow to the call site, so{' '}
            <code className="font-mono text-xs">
              incrementCounter({'{'} data: {'{'} by: 999 {'}'} {'}'})
            </code>{' '}
            does not compile.
          </p>
        </Card>
      </div>

      <div className="space-y-6">
        <Card eyebrow="Decision guide" title="Server function or IPC?">
          <div className="space-y-3 text-sm">
            <div>
              <Pill tone="cyan">Server function</Pill>
              <p className="mt-1 text-slate-400">
                Data for the UI: reads/writes that belong to the app domain and
                should behave identically on the web target. Runs in the SSR
                process, so it has the filesystem and can use secrets.
              </p>
            </div>
            <div>
              <Pill tone="amber">IPC</Pill>
              <p className="mt-1 text-slate-400">
                Desktop capabilities: OS dialogs, tray, menus, shell,
                notifications, window control. Anything that needs the user's
                machine and would be meaningless on a plain web deployment.
              </p>
            </div>
          </div>
        </Card>

        <Card eyebrow="On the server" title="Why this still works offline">
          <ul className="list-disc space-y-2 pl-4 text-sm text-slate-300">
            <li>
              Electron spawns the SSR server as a child process on a random
              loopback port — no internet needed.
            </li>
            <li>
              The server's <code className="font-mono">APP_DATA_DIR</code> is
              Electron's <code className="font-mono">userData</code> directory,
              so writes land in a writable, per-user location.
            </li>
            <li>
              Requests never leave <code className="font-mono">127.0.0.1</code>.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
