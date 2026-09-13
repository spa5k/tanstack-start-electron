import { promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'

/**
 * A tiny filesystem-backed store. This file matches the `*.server.*` naming
 * convention, so TanStack Start's import protection refuses to load it into
 * the client bundle.
 *
 * `APP_DATA_DIR` is injected by the Electron main process when it spawns the
 * production SSR server, so state is written into Electron's per-user
 * `userData` directory instead of somewhere inside the app bundle.
 */
export interface CounterState {
  value: number
  updatedAt: string | null
}

export function resolveCounterFile(): string {
  const baseDir = process.env.APP_DATA_DIR ?? process.cwd()
  return join(baseDir, 'server-state', 'counter.json')
}

export async function readCounter(): Promise<CounterState> {
  try {
    const raw = await fs.readFile(resolveCounterFile(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<CounterState>
    return {
      value: typeof parsed.value === 'number' ? parsed.value : 0,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
    }
  } catch {
    return { value: 0, updatedAt: null }
  }
}

export async function writeCounter(state: CounterState): Promise<void> {
  const file = resolveCounterFile()
  await fs.mkdir(dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify(state, null, 2), 'utf8')
}
