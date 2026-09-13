import { useDesktop } from '~/lib/desktop-client'
import { Pill } from './ui'

/**
 * Renders differently on the server, the plain web client, and Electron.
 * `useDesktop()` starts as `null` on both the server and the first client
 * render, so there is never a hydration mismatch — the badge simply upgrades
 * after hydration.
 */
export function DesktopBadge() {
  const desktop = useDesktop()

  if (!desktop) {
    return <Pill>Web preview — no IPC</Pill>
  }

  return (
    <Pill tone="emerald">
      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
      Electron · {desktop.platform}
    </Pill>
  )
}
