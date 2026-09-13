import { app, type BrowserWindow } from 'electron'
import { stopProductionServer } from './server'

/**
 * A headless end-to-end check for CI. It drives the real renderer through
 * `webContents.executeJavaScript`, so it tests SSR, hydration, client-side
 * routing, server-function RPC, RSC, streaming and the preload bridge.
 *
 * Run it with `pnpm smoke`, or against the dev server with
 * `ELECTRON_SMOKE_TEST=1 npx electron .`.
 */

interface SmokeResult {
  title: string
  heading: string | null
  desktop: { platform: string; version: string; isPackaged: boolean } | null
  counterBefore: string | null
  counterAfter: string | null
  rscPath: string
  rscText: string | null
  rscPreview: string
  streamedText: string | null
}

const rendererScript = /* js */ `
(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const nav = (label) =>
    [...document.querySelectorAll('a')].find(
      (anchor) => anchor.textContent?.trim() === label,
    )
  const button = (label) =>
    [...document.querySelectorAll('button')].find(
      (element) => element.textContent?.trim() === label,
    )

  await wait(1_000)

  const result = {
    title: document.title,
    heading: document.querySelector('[data-testid="hero-heading"]')?.textContent ?? null,
    desktop: null,
    counterBefore: null,
    counterAfter: null,
    rscPath: '',
    rscText: null,
    rscPreview: '',
    streamedText: null,
  }

  if (window.desktop) {
    const info = await window.desktop.invoke.appInfo()
    result.desktop = {
      platform: info.platform,
      version: info.version,
      isPackaged: info.isPackaged,
    }
  }

  // Client-side navigation + a server-function mutation.
  nav('Server Functions')?.click()
  await wait(900)
  result.counterBefore =
    document.querySelector('[data-testid="counter-value"]')?.textContent?.trim() ?? null
  button('+3')?.click()
  await wait(1_200)
  result.counterAfter =
    document.querySelector('[data-testid="counter-value"]')?.textContent?.trim() ?? null

  // React Server Components route.
  nav('Server Components')?.click()
  await wait(2_500)
  result.rscPath = location.pathname
  result.rscText = document.body.textContent?.includes('Rendered by a server component')
    ? 'server component rendered'
    : null
  result.rscPreview = (document.body.textContent ?? '').slice(0, 1500)

  // Streaming SSR route (resolved content should be present after the wait).
  nav('Streaming SSR')?.click()
  await wait(2_500)
  result.streamedText = document.body.textContent?.includes('resolved in')
    ? 'deferred chunk streamed'
    : null

  return result
})()
`

const checks: Array<{ label: string; ok: (result: SmokeResult) => boolean }> = [
  {
    label: 'SSR HTML contains the hero heading',
    ok: (result) => Boolean(result.heading?.includes('full-stack React framework')),
  },
  {
    label: 'preload bridge answers appInfo()',
    ok: (result) => Boolean(result.desktop?.version),
  },
  {
    label: 'client-side navigation + server function mutation',
    ok: (result) =>
      result.counterBefore !== null &&
      result.counterAfter !== null &&
      Number(result.counterAfter) === Number(result.counterBefore) + 3,
  },
  {
    label: 'React Server Components route renders',
    ok: (result) => result.rscText === 'server component rendered',
  },
  {
    label: 'streamed deferred data arrives',
    ok: (result) => result.streamedText === 'deferred chunk streamed',
  },
]

export async function runSmokeTest(window: BrowserWindow): Promise<void> {
  try {
    // Make sure the document is ready before driving it.
    await new Promise<void>((resolve) => {
      if (!window.webContents.isLoading()) {
        resolve()
        return
      }
      window.webContents.once('did-finish-load', () => resolve())
    })

    const result = (await window.webContents.executeJavaScript(
      rendererScript,
    )) as SmokeResult

    console.log('\n── Electron smoke test ─────────────────────────')
    console.log(JSON.stringify(result, null, 2))

    let failed = 0
    for (const check of checks) {
      const ok = check.ok(result)
      if (!ok) failed += 1
      console.log(`${ok ? '✔' : '✘'} ${check.label}`)
    }

    console.log(
      failed === 0
        ? '\nAll smoke checks passed.\n'
        : `\n${failed} smoke check(s) failed.\n`,
    )

    stopProductionServer()
    app.exit(failed === 0 ? 0 : 1)
  } catch (error) {
    console.error('Smoke test crashed:', error)
    stopProductionServer()
    app.exit(1)
  }
}
