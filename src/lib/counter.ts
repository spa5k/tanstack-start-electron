import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { readCounter, resolveCounterFile, writeCounter } from './counter.server'

/**
 * Server functions are safe to import anywhere. During SSR they run in the
 * server process; in the browser they become a typed fetch call. The
 * `.server.ts` import above only executes inside these handlers.
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
