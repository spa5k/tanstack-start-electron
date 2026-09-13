import { useEffect, useState } from 'react'

/**
 * Client-only clock. Use it with `<ClientOnly>` so the server HTML and the
 * first client render match.
 */
export function ClientClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <p className="font-mono text-sm text-neutral-700">
      {now.toLocaleTimeString()}
      <span className="ml-2 text-neutral-400">ticks after hydration</span>
    </p>
  )
}
