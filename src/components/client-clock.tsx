import { useEffect, useState } from 'react'

/**
 * Renders on the client only (mounted *after* hydration). Used together with
 * `<ClientOnly>` so the SSR HTML never contains a timestamp that would differ
 * from the first client render.
 */
export function ClientClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <p className="font-mono text-sm text-emerald-200">
      client clock · {now.toLocaleTimeString()}
      <span className="ml-2 text-emerald-400/60">
        (ticks only after hydration)
      </span>
    </p>
  )
}
