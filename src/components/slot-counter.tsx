import { ClientOnly } from '@tanstack/react-router'
import { useState } from 'react'

/**
 * A client-only component used inside a server component's `children` slot on
 * the RSC page. It proves that server-rendered markup can wrap interactive
 * client islands.
 */
export function SlotCounter({ label = 'slot counter' }: { label?: string }) {
  const [count, setCount] = useState(0)

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400">{label}</span>
      <button
        type="button"
        onClick={() => setCount((value) => value + 1)}
        className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20"
      >
        clicked {count} {count === 1 ? 'time' : 'times'}
      </button>
      <ClientOnly fallback={<span className="text-xs text-slate-500">…</span>}>
        <span className="font-mono text-[11px] text-slate-500">
          hydrated in {typeof window === 'undefined' ? 'server' : 'browser'}
        </span>
      </ClientOnly>
    </div>
  )
}
