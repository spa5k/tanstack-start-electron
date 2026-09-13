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
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
            Server functions
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            Type-safe RPC without an API layer. The handler runs in the SSR
            process and writes a file on disk. The client only sees a
            fetch-shaped stub.
          </p>
        </div>

        <Card eyebrow="Mutation" title="Filesystem-backed counter">
          <p
            className="text-5xl font-semibold tabular-nums text-neutral-900"
            data-testid="counter-value"
          >
            {counter.value}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
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
              onClick={() => run(() => resetCounter())}
            >
              reset
            </Button>
          </div>

          {isPending ? (
            <p className="mt-2 text-xs text-neutral-500">calling server fn…</p>
          ) : null}
          {error ? (
            <p className="mt-2 border border-red-300 bg-red-50 p-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}

          <dl className="mt-4">
            <KeyValue label="storage" value={counter.storagePath} />
          </dl>
        </Card>

        <Card eyebrow="Validation" title="Zod runs on the server">
          <p>
            <code className="font-mono text-xs">
              .validator(z.object({'{'} by: z.number().int().min(1).max(10) {'}'}))
            </code>{' '}
            rejects bad payloads before your handler runs. The same types flow
            to the call site, so{' '}
            <code className="font-mono text-xs">
              incrementCounter({'{'} data: {'{'} by: 999 {'}'} {'}'})
            </code>{' '}
            does not compile.
          </p>
        </Card>
      </div>

      <div className="space-y-6">
        <Card eyebrow="Decision guide" title="Server function or IPC?">
          <div className="space-y-3">
            <div>
              <Pill>Server function</Pill>
              <p className="mt-2 text-neutral-600">
                Data for the UI. Reads and writes that belong to the app
                domain. The code also behaves the same on a web deployment.
              </p>
            </div>
            <div>
              <Pill>IPC</Pill>
              <p className="mt-2 text-neutral-600">
                Desktop functions. Dialogs, tray, menus, shell, notifications
                and window control. These need the user machine.
              </p>
            </div>
          </div>
        </Card>

        <Card eyebrow="On the server" title="Why this works offline">
          <ul className="list-disc space-y-2 pl-4">
            <li>
              Electron starts the SSR server as a child process on a random
              loopback port. No internet needed.
            </li>
            <li>
              The server gets{' '}
              <code className="font-mono text-xs">APP_DATA_DIR</code> from
              Electron. All writes go to the per-user{' '}
              <code className="font-mono text-xs">userData</code> directory.
            </li>
            <li>
              Requests never leave{' '}
              <code className="font-mono text-xs">127.0.0.1</code>.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
