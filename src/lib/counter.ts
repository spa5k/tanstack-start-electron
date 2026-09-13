import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { readCounter, resolveCounterFile, writeCounter } from './counter.server'

/**
 * Server functions are RPC endpoints that are safe to import from any route
 * or component. On the server they run in-process (no HTTP hop during SSR);
 * in the browser they become a typed `fetch()` call.
 *
 * Note that the `.server.ts` import above only ever executes inside these
 * handlers — the client bundle gets a stub.
 */

export const getCounter = createServerFn({ method: 'GET' }).handler(
  async () => {
    const state = await readCounter()
    return { ...state, storagePath: resolveCounterFile() }
  },
)

export const incrementCounter = createServerFn({ method: 'POST' })
  .validator(z.object({ by: z.number().int().min(1).max(10) }))
  .handler(async ({ data }) => {
    const current = await readCounter()
    const next = {
      value: current.value + data.by,
      updatedAt: new Date().toISOString(),
    }
    await writeCounter(next)
    return next
  })

export const resetCounter = createServerFn({ method: 'POST' }).handler(
  async () => {
    const next = { value: 0, updatedAt: new Date().toISOString() }
    await writeCounter(next)
    return next
  },
)
