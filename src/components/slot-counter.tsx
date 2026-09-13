import { useState } from 'react'

/**
 * A client component for the `children` slot of a server component. It shows
 * that server markup can wrap interactive client islands.
 */
export function SlotCounter({ label = 'slot counter' }: { label?: string }) {
  const [count, setCount] = useState(0)

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-neutral-500">{label}</span>
      <button
        type="button"
        onClick={() => setCount((value) => value + 1)}
        className="border border-neutral-300 bg-white px-3 py-1 text-sm text-neutral-900 hover:bg-neutral-100"
      >
        clicked {count} {count === 1 ? 'time' : 'times'}
      </button>
    </div>
  )
}
