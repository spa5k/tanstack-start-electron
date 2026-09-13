import {
  BrowserWindow,
  app,
  dialog,
  ipcMain,
  nativeTheme,
  shell,
} from 'electron'
import { IPC } from '../../src/lib/desktop-contract'
import type {
  AppInfo,
  PickFileOptions,
  ThemeChangedPayload,
} from '../../src/lib/desktop-contract'

/* -------------------------------------------------------------------------- */
/* Input validation                                                           */
/* -------------------------------------------------------------------------- */

/**
 * IPC arguments arrive from a web context. Treat them as untrusted input —
 * the renderer could be compromised by a malicious page or XSS.
 */
function assertHttpUrl(value: unknown): URL {
  if (typeof value !== 'string') {
    throw new TypeError('Expected a URL string')
  }

  const url = new URL(value)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`Refusing to open non-http(s) URL: ${url.protocol}`)
  }

  return url
}

function sanitizeFilters(value: unknown): Array<{ name: string; extensions: Array<string> }> | undefined {
  if (!Array.isArray(value)) return undefined

  const filters = value
    .filter((entry): entry is { name: string; extensions: Array<string> } => {
      return (
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as { name?: unknown }).name === 'string' &&
        Array.isArray((entry as { extensions?: unknown }).extensions)
      )
    })
    .map((entry) => ({
      name: entry.name,
      extensions: entry.extensions.filter(
        (extension): extension is string => typeof extension === 'string',
      ),
    }))

  return filters.length > 0 ? filters : undefined
}

/* -------------------------------------------------------------------------- */
/* Handlers                                                                   */
/* -------------------------------------------------------------------------- */

export function registerIpcHandlers(): void {
  ipcMain.handle(
    IPC.invoke.appInfo,
    (): AppInfo => ({
      name: app.getName(),
      version: app.getVersion(),
      isPackaged: app.isPackaged,
      platform: process.platform,
      arch: process.arch,
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
      v8: process.versions.v8,
      locale: app.getLocale(),
      userData: app.getPath('userData'),
      appPath: app.getAppPath(),
    }),
  )

  ipcMain.handle(IPC.invoke.ping, (_event, message: unknown): string => {
    const text = typeof message === 'string' ? message : ''
    return `pong: ${text}`
  })

  ipcMain.handle(IPC.invoke.openExternal, async (_event, url: unknown) => {
    await shell.openExternal(assertHttpUrl(url).toString())
  })

  ipcMain.handle(
    IPC.invoke.pickFile,
    async (event, options: unknown): Promise<string | null> => {
      const safeOptions =
        typeof options === 'object' && options !== null
          ? (options as PickFileOptions)
          : {}

      const browserWindow = BrowserWindow.fromWebContents(event.sender)
      const dialogOptions = {
        title: typeof safeOptions.title === 'string' ? safeOptions.title : undefined,
        filters: sanitizeFilters(safeOptions.filters),
        properties: ['openFile' as const],
      }

      const result = browserWindow
        ? await dialog.showOpenDialog(browserWindow, dialogOptions)
        : await dialog.showOpenDialog(dialogOptions)

      if (result.canceled || result.filePaths.length === 0) return null
      return result.filePaths[0]
    },
  )

  // Push native-theme changes to every open window.
  nativeTheme.on('updated', () => {
    const payload: ThemeChangedPayload = {
      shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
    }

    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(IPC.events.themeChanged, payload)
    }
  })
}
