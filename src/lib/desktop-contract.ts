/**
 * ─────────────────────────────────────────────────────────────────────────────
 * The Electron ⇄ preload ⇄ renderer contract
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * This module is the single source of truth for every IPC channel and payload.
 * It is imported by:
 *
 *   • `electron/src/preload.ts`  → to build the `window.desktop` bridge
 *   • `electron/src/ipc.ts`      → to register `ipcMain.handle` listeners
 *   • renderer components        → for fully typed `window.desktop.*` calls
 *
 * It contains only constants and types, so it is safe to bundle into the
 * sandboxed preload script *and* into the browser renderer bundle.
 */

export const IPC = {
  /** Renderer → main request/response channels (`ipcRenderer.invoke`). */
  invoke: {
    appInfo: 'desktop:app-info',
    ping: 'desktop:ping',
    openExternal: 'desktop:open-external',
    pickFile: 'desktop:pick-file',
  },
  /** Main → renderer push channels (`webContents.send`). */
  events: {
    themeChanged: 'desktop:theme-changed',
  },
} as const

export interface AppInfo {
  name: string
  version: string
  isPackaged: boolean
  platform: NodeJS.Platform
  arch: string
  electron: string
  chrome: string
  node: string
  v8: string
  locale: string
  /** Electron's per-user data directory (`app.getPath('userData')`). */
  userData: string
  /** Absolute path of the app bundle / project root. */
  appPath: string
}

export interface PickFileOptions {
  title?: string
  filters?: Array<{ name: string; extensions: Array<string> }>
}

export interface ThemeChangedPayload {
  shouldUseDarkColors: boolean
}

/** Methods exposed on `window.desktop.invoke`. */
export interface DesktopInvoke {
  appInfo: () => Promise<AppInfo>
  ping: (message: string) => Promise<string>
  openExternal: (url: string) => Promise<void>
  pickFile: (options?: PickFileOptions) => Promise<string | null>
}

/** Push events exposed on `window.desktop.on`. */
export interface DesktopEvents {
  themeChanged: ThemeChangedPayload
}

export interface DesktopApi {
  /** `process.platform` from the preload script — available synchronously. */
  platform: NodeJS.Platform
  invoke: DesktopInvoke
  /** Subscribe to a main-process event. Returns an unsubscribe function. */
  on: <K extends keyof DesktopEvents>(
    event: K,
    listener: (payload: DesktopEvents[K]) => void,
  ) => () => void
}

declare global {
  interface Window {
    /**
     * Injected by `electron/src/preload.ts` via `contextBridge`.
     * `undefined` when the app is running in a plain browser (`vite dev`).
     */
    desktop?: DesktopApi
  }
}
