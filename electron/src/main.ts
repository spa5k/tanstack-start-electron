import { BrowserWindow, app, dialog, shell } from 'electron'
import { join } from 'node:path'
import { registerIpcHandlers } from './ipc'
import { buildApplicationMenu } from './menu'
import { startProductionServer, stopProductionServer } from './server'
import { runSmokeTest } from './smoke'

/** The renderer URL for `vite dev`. Override with ELECTRON_RENDERER_URL. */
const DEV_SERVER_URL =
  process.env.ELECTRON_RENDERER_URL ?? 'http://localhost:3000'

/**
 * The dev server is used only when a developer asks for it:
 *
 *   • `pnpm dev` sets NODE_ENV=development, or
 *   • ELECTRON_RENDERER_URL points at a running dev server.
 *
 * Every other run — including an unpackaged run after `pnpm build` — uses the
 * built `.output` server. ELECTRON_FORCE_PRODUCTION=1 forces that path too.
 * A packaged app always uses the built server.
 */
const useDevServer =
  !app.isPackaged &&
  process.env.ELECTRON_FORCE_PRODUCTION !== '1' &&
  (process.env.NODE_ENV === 'development' ||
    Boolean(process.env.ELECTRON_RENDERER_URL))
const smokeTest = process.env.ELECTRON_SMOKE_TEST === '1'

/**
 * Origins the renderer is allowed to navigate to. Anything else is opened in
 * the user's browser instead of inside the app shell.
 */
const allowedOrigins = new Set<string>()
const isAllowedOrigin = (origin: string) => allowedOrigins.has(origin)

let mainWindow: BrowserWindow | null = null

async function waitForUrl(
  url: string,
  { timeoutMs = 60_000, intervalMs = 250 } = {},
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let lastError: unknown

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.status < 500) return
      lastError = new Error(`HTTP ${response.status}`)
    } catch (cause) {
      lastError = cause
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error(
    `Timed out waiting for ${url} after ${timeoutMs}ms (${String(lastError)})`,
  )
}

async function resolveRendererUrl(): Promise<string> {
  if (useDevServer) {
    // `vite dev` may still be booting — poll until it answers.
    await waitForUrl(DEV_SERVER_URL)
    return DEV_SERVER_URL
  }

  // Production: start the Nitro server from `.output` and wait for its health route.
  const origin = await startProductionServer()
  await waitForUrl(`${origin}/api/health`)
  return origin
}

function createWindow(url: string): BrowserWindow {
  allowedOrigins.add(new URL(url).origin)

  const window = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#ffffff',
    title: 'TanStack Start × Electron',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      // `build/preload.cjs` is emitted by tsup next to `main.cjs`.
      preload: join(__dirname, 'preload.cjs'),
      // Secure defaults: no Node in the renderer, bridge everything through
      // the preload script's contextBridge.
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      // Timers must keep firing while the smoke test drives a hidden window.
      backgroundThrottling: !smokeTest,
    },
  })

  window.once('ready-to-show', () => window.show())

  const showFallback = setTimeout(() => {
    if (!window.isDestroyed()) window.show()
  }, 5_000)
  window.once('closed', () => clearTimeout(showFallback))

  window
    .loadURL(url)
    .then(() => {
      console.log(`[main] renderer ready at ${url}`)
    })
    .catch((cause: unknown) => {
      dialog.showErrorBox('Failed to load the renderer', String(cause))
    })

  return window
}

// Only one desktop instance — focus the existing window instead of starting
// a second SSR server on a second port.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  // Harden every WebContents the app creates: external links go to the OS
  // browser, and navigation is locked to the renderer origin.
  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      void shell.openExternal(url)
      return { action: 'deny' }
    })

    contents.on('will-navigate', (event, url) => {
      const target = new URL(url)
      if (target.origin !== 'null' && isAllowedOrigin(target.origin)) return
      event.preventDefault()
      void shell.openExternal(url)
    })
  })

  app.whenReady().then(async () => {
    app.setAppUserModelId('com.example.tanstack-start-electron')

    registerIpcHandlers()
    buildApplicationMenu()

    try {
      const url = await resolveRendererUrl()
      mainWindow = createWindow(url)
      if (smokeTest) await runSmokeTest(mainWindow)
    } catch (cause) {
      dialog.showErrorBox(
        'Could not start the app',
        cause instanceof Error ? cause.message : String(cause),
      )
      app.quit()
      return
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void resolveRendererUrl().then((url) => {
          mainWindow = createWindow(url)
        })
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('will-quit', () => {
    stopProductionServer()
  })
}
