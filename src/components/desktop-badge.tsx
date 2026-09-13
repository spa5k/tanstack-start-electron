import { useDesktop } from '~/lib/desktop-client'
import { Pill } from './ui'

/**
 * Shows "Electron" or "Web preview". `useDesktop()` is `null` on the server
 * and on the first client render, so hydration never fails.
 */
export function DesktopBadge() {
  const desktop = useDesktop()

  if (!desktop) {
    return <Pill>Web preview</Pill>
  }

  return (
    <Pill tone="ok">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
      Electron · {desktop.platform}
    </Pill>
  )
}
