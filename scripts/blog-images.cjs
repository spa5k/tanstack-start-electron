/**
 * Renders the blog diagram and terminal images from blog/diagrams.html.
 * Each element with a `data-shot` attribute becomes one PNG in blog/.
 *
 * Usage: pnpm blog:images
 */
const { app, BrowserWindow } = require('electron')
const { mkdirSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')

const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'blog')

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function main() {
  const window = new BrowserWindow({
    width: 1400,
    height: 1200,
    show: false,
    webPreferences: { backgroundThrottling: false },
  })

  await window.loadFile(join(OUT_DIR, 'diagrams.html'))
  await wait(800)

  const names = await window.webContents.executeJavaScript(
    `[...document.querySelectorAll('[data-shot]')].map((element) => element.dataset.shot)`,
  )

  mkdirSync(OUT_DIR, { recursive: true })

  for (const name of names) {
    await window.webContents.executeJavaScript(`
      document.querySelector('[data-shot="${name}"]').scrollIntoView({ block: 'start' })
    `)
    await wait(400)

    const rect = await window.webContents.executeJavaScript(`
      (() => {
        const element = document.querySelector('[data-shot="${name}"]')
        const box = element.getBoundingClientRect()
        return { x: box.x, y: box.y, width: box.width, height: box.height }
      })()
    `)

    const target = {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    }

    let image
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        image = await window.webContents.capturePage(target)
        break
      } catch (error) {
        if (attempt === 4) throw error
        await wait(500)
      }
    }

    const file = join(OUT_DIR, `${name}.png`)
    writeFileSync(file, image.toPNG())
    console.log(`saved ${file}`)
  }

  app.quit()
}

app.whenReady().then(main).catch((error) => {
  console.error(error)
  app.exit(1)
})
