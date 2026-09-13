import { useDesktop } from '~/lib/desktop-client'
import { Pill } from './ui'

/**
 * Shows "Electron" or "Web preview". `useDesktop()` is `null` on the server
 * and on the first client render, so hydration never fails.
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
