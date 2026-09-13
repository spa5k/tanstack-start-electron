import { useEffect, useState } from 'react'
import { useDesktop } from '~/lib/desktop-client'
import type { AppInfo } from '~/lib/desktop-contract'
import { Button, Card, KeyValue, Pill } from './ui'

export function DesktopPanel() {
  const desktop = useDesktop()

  const [info, setInfo] = useState<AppInfo | null>(null)
  const [pingInput, setPingInput] = useState('hello from the renderer')
  const [pingReply, setPingReply] = useState<string | null>(null)
  const [pickedFile, setPickedFile] = useState<string | null>(null)
  const [lastTheme, setLastTheme] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!desktop) return

    let cancelled = false

    desktop.invoke
      .appInfo()
      .then((next) => {
        if (!cancelled) setInfo(next)
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(String(cause))
      })

    // Main → renderer push events, subscribed through the preload bridge.
    const unsubscribe = desktop.on('themeChanged', (payload) => {
      setLastTheme(payload.shouldUseDarkColors ? 'dark' : 'light')
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [desktop])

  if (!desktop) {
    return (
      <Card
        eyebrow="Electron bridge"
        title="Preload API not detected"
        className="border-dashed"
      >
        <p>
          You are looking at the plain Vite dev server (or a production
          SSR-only render). Start the desktop shell with{' '}
          <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-xs text-cyan-200">
            npm run dev
          </code>{' '}
          to exercise the IPC bridge.
        </p>
      </Card>
    )
  }

  return (
    <Card
      eyebrow="Electron bridge"
      title="window.desktop — contextBridge IPC"
      className="border-emerald-400/20"
    >
      <div className="flex flex-wrap gap-2">
        <Pill tone="emerald">contextIsolation: true</Pill>
        <Pill tone="emerald">sandbox: true</Pill>
        <Pill tone="emerald">nodeIntegration: false</Pill>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 p-2 text-xs text-red-200">
          {error}
        </p>
      ) : null}

      <dl className="mt-4">
        <KeyValue label="app" value={info ? `${info.name} v${info.version}` : '…'} />
        <KeyValue label="electron" value={info?.electron ?? '…'} />
        <KeyValue label="chrome" value={info?.chrome ?? '…'} />
        <KeyValue label="node (main)" value={info?.node ?? '…'} />
        <KeyValue label="packaged" value={String(info?.isPackaged ?? '…')} />
        <KeyValue label="userData" value={info?.userData ?? '…'} />
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <input
          value={pingInput}
          onChange={(event) => setPingInput(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white outline-none focus:border-cyan-400/50"
        />
        <Button
          onClick={() => {
            setPingReply(null)
            desktop.invoke
              .ping(pingInput)
              .then(setPingReply)
              .catch((cause: unknown) => setError(String(cause)))
          }}
        >
          invoke ping
        </Button>
      </div>

      {pingReply ? (
        <p className="mt-2 font-mono text-xs text-emerald-200">→ {pingReply}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          onClick={() => {
            desktop.invoke
              .openExternal('https://tanstack.com/start')
              .catch((cause: unknown) => setError(String(cause)))
          }}
        >
          open docs in browser
        </Button>
        <Button
          onClick={() => {
            desktop.invoke
              .pickFile({
                title: 'Pick any file to prove the IPC round trip',
                filters: [{ name: 'All files', extensions: ['*'] }],
              })
              .then((file) => setPickedFile(file))
              .catch((cause: unknown) => setError(String(cause)))
          }}
        >
          pick a file
        </Button>
      </div>

      {pickedFile ? (
        <p className="mt-2 font-mono text-xs break-all text-cyan-200">
          selected: {pickedFile}
        </p>
      ) : null}

      <p className="mt-4 text-xs text-slate-500">
        Last `themeChanged` push from the main process:{' '}
        <span className="font-mono text-slate-300">{lastTheme ?? 'none yet'}</span>
      </p>
    </Card>
  )
}
