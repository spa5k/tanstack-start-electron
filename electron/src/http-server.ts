import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { app } from 'electron'

/**
 * The optional loopback HTTP mode.
 *
 * The default mode imports the handler into the main process and serves it
 * over `app://`. This mode starts `build/serve.cjs` as a child process
 * instead, so the renderer can load `http://127.0.0.1:<port>`. Cookies and
 * other web APIs then behave as usual. The cost is an open local port.
 *
 * Select it with ELECTRON_USE_HTTP_SERVER=1.
 */

let child: ChildProcess | null = null

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address() as { port: number }
      probe.close(() => resolve(port))
    })
  })
}

function resolveServeScript(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'app-server', 'serve.cjs')
  }

  const candidates = [
    join(app.getAppPath(), 'build', 'serve.cjs'),
    join(process.cwd(), 'build', 'serve.cjs'),
  ]
  return candidates.find((path) => existsSync(path)) ?? candidates[0]
}

export async function startHttpServer(serverRoot: string): Promise<string> {
  const port = await freePort()
  const origin = `http://127.0.0.1:${port}`

  const script = resolveServeScript()
  const entry = join(serverRoot, 'server', 'index.mjs')

  const running = spawn(process.execPath, [script], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(port),
      HOST: '127.0.0.1',
      APP_SERVER_ENTRY: entry,
      APP_DATA_DIR: app.getPath('userData'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  running.stdout?.on('data', (chunk: Buffer) => {
    process.stdout.write(`[http] ${chunk.toString()}`)
  })
  running.stderr?.on('data', (chunk: Buffer) => {
    process.stderr.write(`[http] ${chunk.toString()}`)
  })
  running.on('exit', (code) => {
    child = null
    if (code !== 0 && code !== null) {
      console.error(`[http] server exited with code ${code}`)
    }
  })

  child = running
  return origin
}

export function stopHttpServer(): void {
  if (!child || child.killed) return
  child.kill()
  child = null
}

// Safety net: never leave a stray server behind.
process.once('exit', () => {
  child?.kill()
})
