import { createFileRoute } from '@tanstack/react-router'
import { CompositeComponent } from '@tanstack/react-start/rsc'
import { SlotCounter } from '~/components/slot-counter'
import { Card, Pill } from '~/components/ui'
import { getCompositeDemo, getRenderableDemo } from '~/lib/rsc-demos'

export const Route = createFileRoute('/server-components')({
  loader: async () => {
    const [{ Renderable }, { src }] = await Promise.all([
      getRenderableDemo(),
      getCompositeDemo(),
    ])
    return { Renderable, composite: src }
  },
  component: ServerComponentsPage,
})

function ServerComponentsPage() {
  const { Renderable, composite } = Route.useLoaderData()

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
            React Server Components
          </h1>
          <Pill tone="warn">experimental</Pill>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          Enabled through{' '}
          <code className="font-mono text-xs">@vitejs/plugin-rsc</code> and{' '}
          <code className="font-mono text-xs">
            rsc: {'{'} enabled: true {'}'}
          </code>
          . The server renders these components to a Flight stream. Their code
          and imports never reach the browser.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="border-b border-neutral-200 pb-2 text-sm font-semibold text-neutral-900">
          1 · renderServerComponent — no slots
        </h2>
        {Renderable}
      </section>

      <section className="space-y-3">
        <h2 className="border-b border-neutral-200 pb-2 text-sm font-semibold text-neutral-900">
          2 · createCompositeComponent — server markup, client islands
        </h2>
        <CompositeComponent
          src={composite}
          renderStamp={({ renderedAt, hostname }) => (
            <span>
              stamp · {hostname} · {new Date(renderedAt).toLocaleTimeString()}
            </span>
          )}
        >
          <div className="flex flex-wrap items-center gap-6">
            <SlotCounter label="children slot" />
            <SlotCounter label="another island" />
          </div>
        </CompositeComponent>
      </section>

      <Card eyebrow="Mental model" title="Where each piece runs">
        <ul className="list-disc space-y-2 pl-4">
          <li>
            Server components can be async. They read the filesystem and import
            heavy libraries. They render to a serialized payload.
          </li>
          <li>
            Client components arrive through slots (children, render props and
            component props). They stay interactive.
          </li>
          <li>
            The router caches data by route and params. Call{' '}
            <code className="font-mono text-xs">router.invalidate()</code> to
            refresh a server component after a mutation.
          </li>
        </ul>
      </Card>
    </div>
  )
}
