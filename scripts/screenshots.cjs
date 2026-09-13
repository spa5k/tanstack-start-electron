/**
 * Takes the screenshots used in README.md.
 *
 * It opens the real app on the production handler (`app://renderer/`), loads
 * each page, and saves a JPEG per page.
 *
 * Usage: pnpm screenshots
 */
const { app, BrowserWindow } = require('electron')
const { existsSync, mkdirSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')

const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'screenshots')
const SERVER_ENTRY = join(ROOT, '.output', 'server', 'index.mjs')
const APP_URL = 'app://renderer'

if (!existsSync(SERVER_ENTRY)) {
  console.error('Missing .output/server/index.mjs. Run: pnpm build:web')
  process.exit(1)
}

// Load the real app. This must run before `app.whenReady()` so the custom
// scheme can be registered.
require('../build/main.cjs')

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
  const window = await getMainWindow()
  window.focus()
  mkdirSync(OUT_DIR, { recursive: true })

  for (const page of pages) {
    await window.loadURL(`${APP_URL}${page.path}`)
    await wait(page.waitMs)
    if (page.script) await window.webContents.executeJavaScript(page.script)
    if (page.afterScriptMs) await wait(page.afterScriptMs)

    const file = join(OUT_DIR, `${page.name}.jpg`)
    await capture(window, file)
    console.log(`saved ${file}`)
  }

  app.quit()
}

app.whenReady().then(main).catch((error) => {
  console.error(error)
  app.exit(1)
})
