import { createServerFn } from '@tanstack/react-start'
import {
  createCompositeComponent,
  renderServerComponent,
} from '@tanstack/react-start/rsc'
import { cpus, hostname, platform, release, totalmem } from 'node:os'
import type * as React from 'react'

/**
 * `renderServerComponent(<Element />)` renders a component on the server and
 * returns a serializable value that can be inlined in the client tree.
 * `createCompositeComponent(...)` also accepts slots (children, render props
 * and component props) that client components fill.
 */

function HostReport() {
  const cores = cpus().length
  const totalGb = (totalmem() / 1024 / 1024 / 1024).toFixed(1)

  return (
    <div className="rounded-xl border border-violet-400/20 bg-violet-400/5 p-4">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-violet-300 uppercase">
        Rendered by a server component
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-slate-400">Host</dt>
          <dd className="font-mono text-slate-200">{hostname()}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Platform</dt>
          <dd className="font-mono text-slate-200">
            {platform()} {release()}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">CPU cores</dt>
          <dd className="font-mono text-slate-200">{cores}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Total memory</dt>
          <dd className="font-mono text-slate-200">{totalGb} GB</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-violet-200/70">
        This markup arrived as a Flight payload. None of the code that produced
        it is in your client bundle — inspect the network tab and look for the
        RSC responses separate from the JS chunks.
      </p>
    </div>
  )
}

export const getRenderableDemo = createServerFn({ method: 'GET' }).handler(
  async () => {
    const Renderable = await renderServerComponent(<HostReport />)
    return { Renderable }
  },
)

export const getCompositeDemo = createServerFn({ method: 'GET' }).handler(
  async () => {
    const src = await createCompositeComponent(
      (props: {
        /** Render prop: the server hands data *down* to client code. */
        renderStamp?: (data: {
          renderedAt: string
          hostname: string
        }) => React.ReactNode
        /** Children slot: client components rendered inside server markup. */
        children?: React.ReactNode
      }) => (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-cyan-300 uppercase">
            Composite server component
          </p>
          <p className="mt-2 text-sm text-slate-300">
            The layout, copy and host info below are server-rendered. The
            buttons inside the dashed area are client components passed through
            slots, so they keep their state and event handlers.
          </p>
          <div className="mt-2 font-mono text-xs text-cyan-200">
            {props.renderStamp?.({
              renderedAt: new Date().toISOString(),
              hostname: hostname(),
            })}
          </div>
          <div className="mt-4 rounded-lg border border-dashed border-white/20 p-3">
            {props.children}
          </div>
        </div>
      ),
    )

    return { src }
  },
)
