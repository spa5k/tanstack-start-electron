import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import { getPort } from 'get-port-please'

/**
 * Runs the TanStack Start SSR server as a child of the main process. It uses
 * Electron's own binary in Node mode, so the user needs no system Node:
 *
 *   ELECTRON_RUN_AS_NODE=1 <path-to-electron> .output/server/index.mjs
 *
 * The server binds to a random loopback port. The caller gets that origin.
 */

let serverProcess: ChildProcess | null = null
let serverOrigin: string | null = null

function resolveServerRoot(): string {
  // Packaged builds ship `.output` as an unpacked `extraResource`; dev runs
  // straight out of the project directory.
  return app.isPackaged
    ? join(process.resourcesPath, 'app-server')
    : join(app.getAppPath(), '.output')
}

export function getServerOrigin(): string | null {
  return serverOrigin
}

export async function startProductionServer(): Promise<string> {
  if (serverOrigin) return serverOrigin

  const root = resolveServerRoot()
  const entry = join(root, 'server', 'index.mjs')

  if (!existsSync(entry)) {
    throw new Error(
      `The SSR server bundle was not found at ${entry}.\n` +
        'Run "npm run build:web" (or "npm run build") before starting the packaged app.',
    )
  }

  const port = await getPort({ portRange: [30_011, 50_000] })

  const child = spawn(process.execPath, [entry], {
    cwd: root,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      // Nitro's Node preset reads these at runtime.
      PORT: String(port),
      HOST: '127.0.0.1',
      NITRO_PORT: String(port),
      NITRO_HOST: '127.0.0.1',
      // Hand the server Electron's writable, per-user directory so server
      // functions can persist files without touching the app bundle.
      APP_DATA_DIR: app.getPath('userData'),
      APP_VERSION: app.getVersion(),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout?.on('data', (chunk: Buffer) => {
    process.stdout.write(`[ssr] ${chunk.toString()}`)
  })
  child.stderr?.on('data', (chunk: Buffer) => {
    process.stderr.write(`[ssr] ${chunk.toString()}`)
  })

  child.on('exit', (code, signal) => {
    serverProcess = null
    serverOrigin = null
    if (code !== 0 && code !== null) {
      console.error(`[ssr] server exited with code ${code} (signal ${signal})`)
    }
  })

  serverProcess = child
  serverOrigin = `http://127.0.0.1:${port}`

  return serverOrigin
}

export function stopProductionServer(): void {
  if (!serverProcess || serverProcess.killed) return
  serverProcess.kill()
  serverProcess = null
  serverOrigin = null
}

// Safety net: never leave a stray SSR server behind, even on hard exits.
process.once('exit', () => {
  serverProcess?.kill()
})
