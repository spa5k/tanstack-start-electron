/**
 * Takes the screenshots used in README.md.
 *
 * It starts the production SSR server from `.output/`, points the real Electron
 * app at it, loads each page, and saves a JPEG per page.
 *
 * Usage: pnpm screenshots
 */
const { app, BrowserWindow } = require('electron')
const { spawn } = require('node:child_process')
const { existsSync, mkdirSync, writeFileSync } = require('node:fs')
const { createServer } = require('node:net')
const { join } = require('node:path')
const { tmpdir } = require('node:os')

const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'screenshots')
const SERVER_ENTRY = join(ROOT, '.output', 'server', 'index.mjs')

if (!existsSync(SERVER_ENTRY)) {
  console.error('Missing .output/server/index.mjs. Run: pnpm build:web')
  process.exit(1)
}

const pages = [
  { name: 'overview', path: '/', waitMs: 1_500 },
  { name: 'streaming-ssr', path: '/ssr', waitMs: 2_800 },
  {
    name: 'server-functions',
    path: '/server-functions',
    waitMs: 1_500,
    script: `[...document.querySelectorAll('button')]
      .find((element) => element.textContent?.trim() === '+3')
      ?.click()`,
    afterScriptMs: 1_200,
  },
  { name: 'server-components', path: '/server-components', waitMs: 2_200 },
]

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function getFreePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })
}

async function waitForHealth(origin) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(`${origin}/api/health`)
      if (response.ok) return
    } catch {
      // Retry until the server is ready.
    }
    await wait(250)
  }
  throw new Error('The SSR server did not become ready')
}

async function startServer() {
  const port = await getFreePort()
  const origin = `http://127.0.0.1:${port}`

  const child = spawn(process.execPath, [SERVER_ENTRY], {
    cwd: join(ROOT, '.output'),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(port),
      HOST: '127.0.0.1',
      NITRO_PORT: String(port),
      NITRO_HOST: '127.0.0.1',
      APP_DATA_DIR: join(tmpdir(), 'tanstack-start-electron-screenshots'),
    },
    stdio: ['ignore', 'inherit', 'inherit'],
  })

  await waitForHealth(origin)
  return { child, origin }
}

async function getMainWindow() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const [window] = BrowserWindow.getAllWindows()
    if (window && !window.webContents.isLoading()) return window
    await wait(250)
  }
  throw new Error('The app window did not open')
}

async function capture(window, file) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const image = await window.webContents.capturePage()
      writeFileSync(file, image.toJPEG(88))
      return
    } catch (error) {
      if (attempt === 3) throw error
      await wait(500)
    }
  }
}

async function main() {
  const { child, origin } = await startServer()

  try {
    // Tell the app to load the server that is already running.
    process.env.ELECTRON_RENDERER_URL = origin
    require('../build/main.cjs')

    const window = await getMainWindow()
    window.focus()
    mkdirSync(OUT_DIR, { recursive: true })

    for (const page of pages) {
      await window.loadURL(`${origin}${page.path}`)
      await wait(page.waitMs)
      if (page.script) await window.webContents.executeJavaScript(page.script)
      if (page.afterScriptMs) await wait(page.afterScriptMs)

      const file = join(OUT_DIR, `${page.name}.jpg`)
      await capture(window, file)
      console.log(`saved ${file}`)
    }
  } finally {
    child.kill()
  }

  app.quit()
}

app.whenReady().then(main).catch((error) => {
  console.error(error)
  app.exit(1)
})
