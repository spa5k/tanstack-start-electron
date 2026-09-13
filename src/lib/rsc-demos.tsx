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
    <div className="border border-neutral-200">
      <p className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-[11px] font-medium tracking-wider text-neutral-500 uppercase">
        Rendered by a server component
      </p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 text-sm">
        <div>
          <dt className="text-xs text-neutral-500">Host</dt>
          <dd className="mt-0.5 font-mono text-xs text-neutral-900">
            {hostname()}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Platform</dt>
          <dd className="mt-0.5 font-mono text-xs text-neutral-900">
            {platform()} {release()}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">CPU cores</dt>
          <dd className="mt-0.5 font-mono text-xs text-neutral-900">{cores}</dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Total memory</dt>
          <dd className="mt-0.5 font-mono text-xs text-neutral-900">
            {totalGb} GB
          </dd>
        </div>
      </dl>
      <p className="border-t border-neutral-200 px-4 py-3 text-xs leading-relaxed text-neutral-500">
        This markup arrived as a Flight payload. The code that produced it is
        not in your client bundle. Inspect the network tab to see the RSC
        responses next to the JS chunks.
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
        /** Render prop: the server hands data down to client code. */
        renderStamp?: (data: {
          renderedAt: string
          hostname: string
        }) => React.ReactNode
        /** Children slot: client components rendered inside server markup. */
        children?: React.ReactNode
      }) => (
        <div className="border border-neutral-200">
          <p className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-[11px] font-medium tracking-wider text-neutral-500 uppercase">
            Composite server component
          </p>
          <div className="p-4">
            <p className="text-sm text-neutral-700">
              The layout and text below are server-rendered. The buttons inside
              the dashed area are client components from slots. They keep their
              state and event handlers.
            </p>
            <p className="mt-2 font-mono text-xs text-neutral-500">
              {props.renderStamp?.({
                renderedAt: new Date().toISOString(),
                hostname: hostname(),
              })}
            </p>
            <div className="mt-4 border border-dashed border-neutral-300 p-3">
              {props.children}
            </div>
          </div>
        </div>
      ),
    )

    return { src }
  },
)
