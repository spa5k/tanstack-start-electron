import { useEffect, useState } from 'react'
import type { DesktopApi } from './desktop-contract'

/**
 * The renderer sees this bridge, or `null` during SSR and in a plain browser.
 * `window` is read inside an effect so SSR and the first client render agree.
 */
export function useDesktop(): DesktopApi | null {
  const [desktop, setDesktop] = useState<DesktopApi | null>(null)

  useEffect(() => {
    setDesktop(window.desktop ?? null)
  }, [])

  return desktop
}
