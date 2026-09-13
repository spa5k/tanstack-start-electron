import { useEffect, useState } from 'react'
import type { DesktopApi } from './desktop-contract'

/**
 * Returns the Electron bridge, or `null` when the page is rendered:
 *   • on the server during SSR, or
 *   • in a plain browser (`vite dev` without Electron).
 *
 * Read `window` only inside an effect so SSR and the first client render agree
 * — otherwise React throws a hydration mismatch.
 */
export function useDesktop(): DesktopApi | null {
  const [desktop, setDesktop] = useState<DesktopApi | null>(null)

  useEffect(() => {
    setDesktop(window.desktop ?? null)
  }, [])

  return desktop
}
