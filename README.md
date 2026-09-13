# TanStack Start × Electron

Run TanStack Start v1 in Electron. This project has SSR, streaming, server functions, server routes,
experimental React Server Components, and a typed IPC bridge.

In production the app **opens no TCP port** by default. Electron imports the built SSR handler into
the main process and serves it over the `app://` scheme. A loopback HTTP mode is also available.

```
┌───────────────────────────────────────────────────────────────────────┐
│  Electron (main)                  Electron (renderer / Chromium)      │
│  ├─ runs the SSR handler          app://renderer/  (no port)          │
│  ├─ window / menu / dialogs       ├─ server-rendered HTML (SSR)       │
│  └─ ipcMain.handle(...)  ◄──────► └─ window.desktop (contextBridge)   │
└───────────────────────────────────────────────────────────────────────┘
```

## Contents

- [Screenshots](#screenshots)
- [Features](#features)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Commands](#commands)
- [Production modes](#production-modes)
- [Project structure](#project-structure)
- [How it works](#how-it-works)
- [The web app](#the-web-app)
- [The Electron side](#the-electron-side)
- [Packaging](#packaging)
- [Smoke test](#smoke-test)
- [Troubleshooting](#troubleshooting)
- [Web deployment](#web-deployment)
- [Versions](#versions)
- [Links](#links)

## Screenshots

![Overview page](screenshots/overview.jpg)

![Streaming SSR page](screenshots/streaming-ssr.jpg)

![Server functions page](screenshots/server-functions.jpg)

![Server components page](screenshots/server-components.jpg)

## Features

- **Routing** — file-based routes in `src/routes` (TanStack Router).
- **SSR and hydration** — the server renders HTML. React hydrates it.
- **Streaming** — deferred loader data arrives after the shell (`src/routes/ssr.tsx`).
- **Server functions** — typed RPC with `createServerFn` and zod validation.
- **Server-only code** — `*.server.ts` files never reach the client.
- **Server routes** — plain HTTP endpoints, for example `src/routes/api/health.ts`.
- **React Server Components** — experimental, with client slots.
- **IPC** — a typed, sandboxed `window.desktop` API.
- **No open ports** — production uses a custom scheme.
- **Packaging** — electron-builder targets for macOS, Windows, and Linux.
- **Tests** — `pnpm smoke` checks all features in the real app.

## Requirements

- Node.js 22 or newer. Tested on Node 26.
- pnpm 11 or newer. npm, yarn, and bun also work.
- macOS, Windows, or Linux.

> `pnpm-workspace.yaml` approves the packages that may run build scripts (`allowBuilds`). pnpm 11
> blocks postinstall scripts by default. This file makes installs the same everywhere.

## Quick start

```bash
pnpm install
pnpm dev
```

`pnpm dev` runs Vite (port 3000), tsup watch, and Electron. Electron waits for Vite, then opens the
window. The renderer gets HMR.

For the production app:

```bash
pnpm start
```

## Commands

| Command               | What it does                                              |
| --------------------- | --------------------------------------------------------- |
| `pnpm dev`            | Vite, tsup watch, and Electron together                   |
| `pnpm build`          | Builds `.output/` (web) and `build/` (Electron)           |
| `pnpm start`          | Builds, then runs the desktop app                         |
| `pnpm start:server`   | Runs the built handler on Node (`scripts/serve.mjs`)      |
| `pnpm smoke`          | Builds and checks all features in Electron                |
| `pnpm typecheck`      | Checks the web app and the Electron code                  |
| `pnpm screenshots`    | Builds, then saves the screenshots to `screenshots/`      |
| `pnpm dist`           | Packages installers into `release/`                       |
| `pnpm dist:dir`       | Packages an unpacked app directory (fast)                 |

Environment variables:

| Variable                      | Effect                                                    |
| ----------------------------- | --------------------------------------------------------- |
| `ELECTRON_USE_HTTP_SERVER=1`  | Uses the loopback HTTP mode instead of `app://`           |
| `ELECTRON_RENDERER_URL`       | Uses that URL instead of the built handler                |
| `ELECTRON_FORCE_PRODUCTION=1` | Uses the built handler, even with `NODE_ENV=development`  |
| `ELECTRON_SMOKE_TEST=1`       | Runs the smoke test and exits non-zero on failure          |

## Production modes

Both modes use the same build. The default is the custom scheme.

| | Custom scheme (default) | Loopback HTTP |
| --- | --- | --- |
| Command | `pnpm start` | `ELECTRON_USE_HTTP_SERVER=1 pnpm start` |
| Port | none | random `127.0.0.1` port |
| Server | in the main process | child process |
| Cookies | custom jar, see below | normal Chromium cookies |
| Use it when | you want no ports | you need normal cookie or origin behavior |

The loopback mode exists as an escape hatch. Use it if the scheme limits below break your app. It
also gives you a browser-debuggable URL.

## Project structure

```
tanstack-start-electron/
├── electron/src/
│   ├── main.ts          # app lifecycle, window, navigation guards
│   ├── handler.ts       # imports .output/server/index.mjs
│   ├── protocol.ts      # app:// scheme → fetch handler
│   ├── cookies.ts       # cookie jar for the app:// scheme
│   ├── http-server.ts   # optional loopback HTTP mode (child process)
│   ├── serve.ts         # child process entry (built to build/serve.cjs)
│   ├── ipc.ts           # ipcMain.handle and input validation
│   ├── preload.ts       # contextBridge → window.desktop
│   └── smoke.ts         # end-to-end checks
├── scripts/
│   ├── serve.mjs        # runs the handler on Node (web target)
│   └── screenshots.cjs  # saves the README screenshots
├── src/
│   ├── components/      # UI and client islands
│   ├── lib/             # server functions and helpers
│   ├── routes/          # pages and server routes
│   ├── router.tsx
│   └── styles/app.css
├── vite.config.ts
├── electron-builder.yml
└── pnpm-workspace.yaml
```

## How it works

### Development

```
pnpm dev
  ├─ vite dev (port 3000, HMR)  ◄──── electron loads http://localhost:3000
  ├─ tsup --watch → build/main.cjs
  └─ nodemon watches build/ → restarts electron
```

`pnpm dev` sets `NODE_ENV=development`. That is the only reason the app uses the dev server.

### Production

`pnpm start` builds and opens the app on the in-process handler.

```
pnpm build
  ├─ vite build
  │    ├─ .output/public/          # client assets
  │    ├─ .output/server/index.mjs # fetch handler (Nitro `standard` preset)
  │    └─ .output/nitro.json
  └─ tsup → build/main.cjs, build/preload.cjs, build/serve.cjs
```

At runtime:

1. `handler.ts` imports `.output/server/index.mjs` into the main process.
2. The main process calls the handler for `/api/health`. The check must pass first.
3. `protocol.ts` registers the `app://` scheme and answers every request from the handler.
4. The window loads `app://renderer/`.

No socket is opened. To confirm this while the app runs:

```bash
lsof -a -p "$(pgrep -f 'Contents/MacOS/Electron' | tr '\n' ',' | sed 's/,$//')" \
  -iTCP -sTCP:LISTEN -P -n
```

The command prints no rows. In HTTP mode it prints one row.

### What the custom scheme changes

Chromium gives custom schemes a few limits. The HTTP mode avoids all of them.

| Area | What happens |
| ---- | ------------ |
| Cookies | Chromium blocks cookies for custom schemes. `cookies.ts` adds a jar. Server sessions work. |
| `document.cookie` | Always empty. Page JavaScript cannot read or write cookies. |
| Cookie attributes | The jar ignores `Domain` and `Path`, and is one origin. Cookies clear when the app quits. |
| Server origin | The handler sees `http://localhost`. Use relative URLs. |
| Service workers | Not enabled. |
| Third-party sign-in | A provider may reject an `app://` redirect. Use the system browser and IPC. |
| Everything else | Modules, fetch, history, streaming, `localStorage`, IndexedDB, and `crypto` work. |

## The web app

### Routing

TanStack Router reads `src/routes` and writes `src/routeTree.gen.ts`. Add a file and you get a route.
The root route renders the `<html>` document with the `shellComponent` slot.

### SSR and hydration

Loaders run during SSR and on client navigation. Read browser values inside an effect:

```ts
export function useDesktop(): DesktopApi | null {
  const [desktop, setDesktop] = useState<DesktopApi | null>(null)
  useEffect(() => setDesktop(window.desktop ?? null), [])
  return desktop
}
```

The server and first client render both return `null`. So hydration never fails.

### Streaming

Return an unawaited promise from a loader and render it with `<Await>`:

```tsx
loader: () => ({ report: getSlowReport() }) // NOT awaited

<Suspense fallback={<Skeleton />}>
  <Await promise={report}>{(data) => <Report data={data} />}</Await>
</Suspense>
```

React sends the shell first and the rest later in the same response.

> Bot user-agents are buffered on purpose (`isbot`). Test with a browser user-agent.

### Server functions

```ts
export const incrementCounter = createServerFn({ method: 'POST' })
  .validator(z.object({ by: z.number().int().min(1).max(10) }))
  .handler(async ({ data }) => {
    const current = await readCounter()
    return writeCounter({ value: current.value + data.by })
  })
```

During SSR the handler runs in the main process. In the browser it is a network call. Call
`router.invalidate()` after a mutation.

### Server-only code

Import protection blocks `**/*.server.*` in the client and `@tanstack/react-start/server` in the
client. It blocks `*.client.*` in the server. The markers `import '@tanstack/react-start/server-only'`
and `.../client-only'` do the same for other names. A production build fails on a violation.

### Server routes

```ts
export const Route = createFileRoute('/api/health')({
  server: { handlers: { GET: () => Response.json({ ok: true }) } },
})
```

### React Server Components

RSC is experimental. Add `@vitejs/plugin-rsc`, `react-server-dom-webpack`, `rsc()`, and
`rsc: { enabled: true }`. Use the helpers from `@tanstack/react-start/rsc`:

| Helper | Use case |
| ------ | -------- |
| `renderServerComponent(<El />)` | Renders a component on the server |
| `createCompositeComponent(fn)` + `<CompositeComponent>` | Server markup with client slots |

See `src/lib/rsc-demos.tsx`. Remove `rsc()` if you do not need it.

## The Electron side

### Main process

- **Single instance lock** — a second launch focuses the open window.
- **`waitForUrl`** — polls the dev URL with a timeout.
- **Navigation guard** — blocks other origins and opens external links in the system browser.
- **Window** — secure defaults, shown after `ready-to-show`.

### Server code

`handler.ts` imports the built fetch handler. It is ESM, so the CJS bundle uses a dynamic `import()`.
The handler runs in the main process. So server functions can call Electron APIs directly. Guard
those imports if you also build for the web.

`src/lib/counter.server.ts` writes to `APP_DATA_DIR`. The main process sets it to Electron's per-user
`userData` directory.

### Preload and IPC

`src/lib/desktop-contract.ts` is the single source of truth for channels and types. All three
processes import it.

```ts
// electron/src/preload.ts
contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  invoke: {
    appInfo: () => ipcRenderer.invoke(IPC.invoke.appInfo),
    ping: (message) => ipcRenderer.invoke(IPC.invoke.ping, message),
  },
  on: (event, listener) => { /* subscribe, and return an unsubscribe function */ },
})
```

```tsx
const desktop = useDesktop()
await desktop.invoke.ping('hello') // → "pong: hello"
```

`ipc.ts` treats every argument as untrusted input. It parses URLs, allows only `http(s)`, and checks
payload types.

### IPC or server function?

If the code also makes sense on the web, use a server function. If it needs the user machine, use
IPC. Native dialogs, menus, and window control belong in IPC. Data, databases, and files belong in
server functions.

### Security defaults

| Setting | Value | Why |
| ------- | ----- | --- |
| `contextIsolation` | `true` | Page JavaScript cannot touch the preload realm. |
| `sandbox` | `true` | The renderer runs in the OS sandbox. |
| `nodeIntegration` | `false` | The page has no `require` and no `process`. |
| `webSecurity` | `true` | Same-origin policy stays on. |

## Packaging

`electron-builder.yml` ships `build/**` in the ASAR and `.output` as `extraResources`. So the package
contains no `node_modules`.

```
release/mac-arm64/TanStack Start Desktop.app/Contents/Resources/
├── app.asar              ~50 KB   (main, preload, package.json)
└── app-server/           ~2.4 MB  (handler, client assets, serve.cjs)
```

Add an icon (`build-resources/icon.png`, 512×512+) and code signing before you distribute. See the
[electron-builder docs](https://www.electron.build/).

## Smoke test

`pnpm smoke` builds the app and drives the real renderer. It checks:

```
✔ SSR HTML contains the hero heading
✔ preload bridge answers appInfo()
✔ client-side navigation + server function mutation
✔ React Server Components route renders
✔ streamed deferred data arrives
✔ streaming is not buffered
```

Use it in CI on Linux with `xvfb-run -a pnpm smoke`. Run the same checks against the dev server with:

```bash
pnpm dev:web &
ELECTRON_SMOKE_TEST=1 npx electron .
```

## Troubleshooting

| Symptom | Fix |
| ------- | --- |
| `Port 3000 is already in use` | Another dev server is running. Run `lsof -ti :3000 \| xargs kill`. |
| `The SSR handler was not found` | Run `pnpm build` first. |
| The app shows the dev server, but you built it | Unset `NODE_ENV` and `ELECTRON_RENDERER_URL`, or run `pnpm start`. |
| A page cannot read `document.cookie` | Expected in scheme mode. Use HTTP mode or store data in the main process. |
| `Ignored build scripts` on install | pnpm blocks postinstall scripts. Run `pnpm approve-builds`. |
| Streaming “does not work” with `curl` | Bot user-agents are buffered on purpose. Add `-A "Mozilla/5.0 …"`. |

## Web deployment

The `standard` Nitro preset exports a fetch handler. For Node:

```bash
pnpm build
node scripts/serve.mjs
```

For Cloudflare, Netlify, or Vercel, use the matching Nitro preset or Vite plugin. Server functions
and RSC work everywhere. Only IPC is desktop-only, and `DesktopPanel` already shows a web fallback.

## Versions

| Package | Version |
| ------- | ------- |
| `@tanstack/react-start` | 1.168.52 |
| `@tanstack/react-router` | 1.170.35 |
| `react` / `react-dom` | 19.3.0 |
| `@vitejs/plugin-rsc` | 0.5.34 |
| `vite` | 8.3.0 |
| `nitro` | 3.0.260903-beta |
| `electron` | 44.3.0 |
| `electron-builder` | 26.15.3 |
| `typescript` | 7.0.2 |

## Links

- [TanStack Start](https://tanstack.com/start/latest/docs/framework/react/overview)
- [Server functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)
- [Server components](https://tanstack.com/start/latest/docs/framework/react/guide/server-components)
- [Hosting and Nitro](https://tanstack.com/start/latest/docs/framework/react/guide/hosting)
- [Electron security](https://www.electronjs.org/docs/latest/tutorial/security)
- [electron-builder](https://www.electron.build/)
