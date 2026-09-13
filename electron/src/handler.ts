import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { app } from 'electron'

export type FetchHandler = (request: Request) => Response | Promise<Response>

/**
 * Loads the Nitro server bundle (the `standard` preset: a plain fetch handler)
 * into the Electron main process.
 *
 * Because the handler runs in-process, server functions and loaders can use
 * Electron APIs directly. No child process and no TCP port are needed.
 */

let loaded: { fetch: FetchHandler; root: string } | null = null

export function resolveServerRoot(): string {
  // Packaged builds ship `.output` as an unpacked `extraResource`; an
  // unpackaged production run reads it from the project directory.
  if (app.isPackaged) {
    return join(process.resourcesPath, 'app-server')
  }

  const candidates = [
    join(app.getAppPath(), '.output'),
    join(process.cwd(), '.output'),
  ]
  return candidates.find((path) => existsSync(path)) ?? candidates[0]
}

export async function loadServerHandler(): Promise<{
  fetch: FetchHandler
  root: string
}> {
  if (loaded) return loaded

  const root = resolveServerRoot()
  const entry = join(root, 'server', 'index.mjs')

  if (!existsSync(entry)) {
    throw new Error(
      `The SSR handler was not found at ${entry}.\n` +
        'Run "pnpm build", then start the app again.',
    )
  }

  const module = (await import(pathToFileURL(entry).href)) as {
    default: { fetch: FetchHandler }
  }

  loaded = { fetch: module.default.fetch, root }
  return loaded
}
