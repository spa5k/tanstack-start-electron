import { createFileRoute } from '@tanstack/react-router'
import { CompositeComponent } from '@tanstack/react-start/rsc'
import { SlotCounter } from '~/components/slot-counter'
import { Card, Pill } from '~/components/ui'
import { getCompositeDemo, getRenderableDemo } from '~/lib/rsc-demos'

export const Route = createFileRoute('/server-components')({
  loader: async () => {
    // Both Flight payloads are produced during SSR, in parallel.
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
    <div className="space-y-6 py-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-white">
            React Server Components
          </h1>
          <Pill tone="amber">experimental</Pill>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Enabled through <code className="font-mono text-cyan-200">@vitejs/plugin-rsc</code>{' '}
          and <code className="font-mono text-cyan-200">rsc: {'{'} enabled: true {'}'}</code>.
          Server components are rendered to a Flight stream and never ship
          their code (or their imports) to the browser.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold tracking-wide text-slate-300">
          1 · renderServerComponent — no slots
        </h2>
        {/* A "renderable" is inlined directly like any other React node. */}
        {Renderable}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold tracking-wide text-slate-300">
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
          <div className="flex flex-wrap items-center gap-4">
            <SlotCounter label="children slot" />
            <SlotCounter label="another island" />
          </div>
        </CompositeComponent>
      </section>

      <Card eyebrow="Mental model" title="Where each piece runs">
        <ul className="list-disc space-y-2 pl-4 text-sm text-slate-300">
          <li>
            <strong className="text-violet-200">Server components</strong> can
            be <code className="font-mono">async</code>, read the filesystem,
            and import heavy libraries. They render to a serialized payload.
          </li>
          <li>
            <strong className="text-cyan-200">Client components</strong> arrive
            through slots (children, render props, component props) and stay
            interactive.
          </li>
          <li>
            Data is cached by route &amp; params; call{' '}
            <code className="font-mono">router.invalidate()</code> to refresh a
            server component after a mutation.
          </li>
        </ul>
      </Card>
    </div>
  )
}
