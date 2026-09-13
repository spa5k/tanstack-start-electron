import { createServerFn } from '@tanstack/react-start'

export interface ReportRow {
  label: string
  value: number
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Deliberately slow. The `/ssr` route does **not** await this in its loader,
 * so the HTML shell streams immediately and this promise resolves into the
 * stream once it is done.
 */
export const getSlowReport = createServerFn({ method: 'GET' }).handler(
  async () => {
    const startedAt = Date.now()
    await sleep(1_500)

    const rows: Array<ReportRow> = [
      { label: 'SSR render', value: 38 },
      { label: 'Server fn', value: 64 },
      { label: 'RSC flight', value: 51 },
      { label: 'Hydration', value: 27 },
      { label: 'IPC round trip', value: 4 },
    ]

    return {
      generatedAt: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      rows,
    }
  },
)
