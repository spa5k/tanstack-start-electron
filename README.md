# TanStack Start × Electron

Run TanStack Start v1 inside Electron. This project has SSR, streaming, server functions, server
routes, and experimental React Server Components. It also has a typed IPC bridge and a sandboxed
renderer.

In production the app **opens no TCP port**. Electron imports the built SSR handler into the main
process. The renderer talks to it over a privileged `app://` scheme. The same handler runs on Node
for the web version.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Electron (main)                     Electron (renderer / Chromium)     │
│  ├─ imports the SSR handler          app://renderer/  (no port)         │
│  │  (.output/server/index.mjs)       ├─ server-rendered HTML (SSR)      │
│  ├─ window / menu / dialogs          ├─ hydration turns HTML into React │
│  └─ ipcMain.handle(...)  ◄────────►  └─ window.desktop (contextBridge)  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Table of contents

- [Screenshots](#screenshots)
- [Features](#features)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Commands](#commands)
- [Project structure](#project-structure)
- [How it works](#how-it-works)
- [What the custom scheme changes](#what-the-custom-scheme-changes)
- [The web app](#the-web-app)
- [The Electron side](#the-electron-side)
- [Building and packaging](#building-and-packaging)
- [Smoke test](#smoke-test)
- [Troubleshooting](#troubleshooting)
- [Web deployment](#web-deployment)
- [Versions](#versions)
- [Further reading](#further-reading)

## Screenshots

Overview. The page shows the SSR snapshot and the live IPC panel:

![Overview page with the server snapshot and the Electron IPC panel](screenshots/overview.jpg)

Streaming SSR. The shell arrives first. The report streams in later:

![Streaming SSR page with the streamed report](screenshots/streaming-ssr.jpg)

Server functions. The counter is stored on the server:

![Server functions page with the filesystem counter](screenshots/server-functions.jpg)

React Server Components. Server markup wraps client islands:

![Server components page with composite RSC demos](screenshots/server-components.jpg)

## Features

| Feature                                 | Where                                            |
| --------------------------------------- | ------------------------------------------------ |
| File-based routing                      | `src/routes/**` (TanStack Router)                 |
| SSR and hydration                       | `src/routes/__root.tsx`                          |
| Streaming SSR and deferred data         | `src/routes/ssr.tsx` (`<Await>`)                  |
| Server functions (typed RPC)            | `src/lib/*.ts` (`createServerFn`)                 |
| Server-only modules and import protection | `src/lib/counter.server.ts`                    |
| Server routes (plain HTTP)              | `src/routes/api/health.ts`                        |
| React Server Components (experimental)  | `src/routes/server-components.tsx`                |
| Typed and sandboxed IPC bridge          | `src/lib/desktop-contract.ts`, preload            |
| Hot reload for renderer and main        | `pnpm dev`                                        |
| No open ports in production             | `electron/src/protocol.ts` (`app://` scheme)      |
| Packaging for macOS, Windows, Linux     | `electron-builder.yml`                            |
| End-to-end smoke test                   | `pnpm smoke`                                      |

## Requirements

- **Node.js 22 or newer.** Tested on Node 26.
- **pnpm 11 or newer.** npm, yarn, and bun also work. Use pnpm in CI.
- **macOS, Windows, or Linux.**

> `pnpm-workspace.yaml` keeps the project as one package. It also lists the packages that may run
> build scripts (`allowBuilds`). pnpm 11 blocks postinstall scripts by default. With this file,
> `pnpm install` works the same on a clean clone and in CI.

## Quick start

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts three processes:

| Process      | Command                  | Port |
| ------------ | ------------------------ | ---- |
| Vite dev SSR | `vite dev`               | 3000 |
| Main bundle  | `tsup --watch`           | —    |
| Desktop app  | `nodemon` → `electron .` | —    |

Electron waits for Vite, then opens the window. The renderer gets HMR.

Build and run the production app:

```bash
pnpm start
```

`pnpm start` builds everything and opens the app on the in-process handler. No port is opened.

## Commands

| Command               | What it does                                                    |
| --------------------- | --------------------------------------------------------------- |
| `pnpm dev`            | Runs Vite, tsup watch, and Electron together                    |
| `pnpm dev:web`        | Runs the Vite dev server only                                   |
| `pnpm dev:desktop`    | Builds and watches the main process, and runs the app           |
| `pnpm build`          | Runs `build:web`, then `build:electron`                         |
| `pnpm build:web`      | Runs `vite build` and writes `.output/`                         |
| `pnpm build:electron` | Runs `tsup` and writes `build/main.cjs` and `build/preload.cjs` |
| `pnpm start`          | Builds, then runs the desktop app                               |
| `pnpm start:server`   | Runs the built handler on Node (`scripts/serve.mjs`)            |
| `pnpm typecheck`      | Checks the web app and the Electron code                        |
| `pnpm smoke`          | Builds and checks all features in Electron                      |
| `pnpm screenshots`    | Builds, then saves the screenshots to `screenshots/`            |
| `pnpm dist`           | Packages installers into `release/`                             |
| `pnpm dist:dir`       | Packages an unpacked app directory (fast)                       |

Environment variables:

| Variable                      | Effect                                                       |
| ----------------------------- | ------------------------------------------------------------ |
| `ELECTRON_RENDERER_URL`       | Uses that URL instead of the built handler                    |
| `ELECTRON_FORCE_PRODUCTION=1` | Uses the built handler, even with `NODE_ENV=development`      |
| `ELECTRON_SMOKE_TEST=1`       | Runs the smoke test and exits non-zero on failure             |

## Project structure

```
tanstack-start-electron/
├── electron/
│   ├── src/
│   │   ├── main.ts        # app lifecycle, window, navigation guards
│   │   ├── handler.ts     # imports .output/server/index.mjs
│   │   ├── protocol.ts    # app:// scheme → fetch handler
│   │   ├── cookies.ts     # cookie jar for the app:// scheme
│   │   ├── ipc.ts         # ipcMain.handle and input validation
│   │   ├── menu.ts        # application menu
│   │   ├── preload.ts     # contextBridge → window.desktop
│   │   └── smoke.ts       # end-to-end checks inside the renderer
│   ├── tsup.config.ts     # main and preload → build/*.cjs
│   └── tsconfig.json
├── scripts/
│   ├── serve.mjs          # serves the handler on Node (web target)
│   └── screenshots.cjs    # saves the README screenshots
├── src/
│   ├── components/        # UI and client islands
│   ├── lib/               # server functions, contracts, helpers
│   ├── routes/            # pages and server routes
│   ├── router.tsx
│   ├── server.ts          # optional custom server entry
│   └── styles/app.css     # Tailwind v4
├── vite.config.ts
├── electron-builder.yml
├── nodemon.json
├── Makefile
└── pnpm-workspace.yaml
```

## How it works

### Development mode

```
pnpm dev
  ├─ vite dev (port 3000, HMR)  ◄──── electron loads http://localhost:3000
  ├─ tsup --watch → build/main.cjs
  └─ nodemon watches build/ → restarts electron
```

`pnpm dev` sets `NODE_ENV=development`. That is the only reason the app uses the dev server. A
change to a route appears immediately. A change to `electron/src/*.ts` restarts the app.

### Production mode

`pnpm start` builds and opens the app on the in-process handler. The selection rules are:

| Condition                             | Renderer used               |
| ------------------------------------- | --------------------------- |
| Packaged app                          | `app://renderer/`           |
| `NODE_ENV=development` (`pnpm dev`)   | Vite dev server             |
| `ELECTRON_RENDERER_URL` is set        | that URL                    |
| Anything else, including `pnpm start` | `app://renderer/`           |

The build:

```
pnpm build
  ├─ vite build
  │    ├─ .output/public/          # client assets
  │    ├─ .output/server/index.mjs # fetch handler (Nitro `standard` preset)
  │    └─ .output/nitro.json
  └─ tsup → build/main.cjs, build/preload.cjs

pnpm dist → electron-builder
  ├─ app.asar                     # main, preload, package.json
  └─ resources/app-server/        # .output, via extraResources
```

At runtime:

1. `electron/src/handler.ts` imports `.output/server/index.mjs` into the main process.
2. The main process calls the handler for `/api/health`. The check must pass first.
3. `electron/src/protocol.ts` registers the `app://` scheme and answers every request from the
   handler.
4. The window loads `app://renderer/`.

No socket is opened. You can confirm this while the app runs:

```bash
lsof -a -p "$(pgrep -f 'Contents/MacOS/Electron' | tr '\n' ',' | sed 's/,$//')" \
  -iTCP -sTCP:LISTEN -P -n
```

The command prints no rows. The same result holds for the packaged app.

## What the custom scheme changes

The custom scheme is how the app avoids an open port. It also changes a few web behaviors. Read this
list before you use sessions, OAuth, or client-side cookies.

| Area | What happens |
| ---- | ------------ |
| **Ports** | Production opens no TCP port. Development still uses port 3000 for Vite and HMR. |
| **Cookies** | Chromium gives custom schemes **no cookie jar** (`Attempted to set a cookie from a scheme that does not support cookies`). `electron/src/cookies.ts` adds one: it sends a `Cookie` header and stores `Set-Cookie` response headers. Server sessions work. |
| **`document.cookie`** | Always empty. Page JavaScript cannot read or write cookies. Use the main process or `localStorage` for client data. |
| **Cookie attributes** | The jar ignores `Domain`, `Path`, `Secure`, and `SameSite`. It is one origin, so this is safe here. |
| **Cookie lifetime** | The jar lives in memory. All cookies are cleared when the app quits. Persist the session another way if you need it to survive a restart. |
| **Server origin** | The handler sees `http://localhost`, not `app://renderer`. Relative URLs work. An absolute URL that the server generates points at `localhost`. |
| **Build output** | `.output/server/index.mjs` exports a fetch handler. It does not listen. Use `pnpm start:server` instead of `node .output/server/index.mjs`. |
| **Service workers** | Not enabled for the scheme. The API exists, but registration needs the `allowServiceWorkers` privilege. |
| **Third-party sign-in** | A provider that redirects to `app://` may reject the URL. Open the flow in the system browser and pass the result back with IPC. |
| **Everything else** | Modules, `fetch`, history, forms, streaming, `localStorage`, IndexedDB, `crypto`, and the `WebSocket` API work. `location.origin` is `app://renderer`, and `window.isSecureContext` is `true`. |

Development mode uses normal HTTP. None of these limits apply there. The same is true for
`pnpm start:server` and the web deployment.

## The web app

### Routing

TanStack Router reads `src/routes` and writes `src/routeTree.gen.ts`. Add a file and you get a route.
The root route uses the `shellComponent` slot to render the `<html>` document.

### SSR and hydration

Route `loader` functions run during SSR and on client navigation. The overview page calls a server
function from its loader:

```ts
export const Route = createFileRoute('/')({
  loader: () => getServerSnapshot(),
  component: OverviewPage,
})
```

During SSR the handler runs in the same process. After hydration, a return to `/` runs the loader
again as an RPC call.

Browser-only values must not run on the server. Read `window` inside an effect:

```ts
export function useDesktop(): DesktopApi | null {
  const [desktop, setDesktop] = useState<DesktopApi | null>(null)
  useEffect(() => setDesktop(window.desktop ?? null), [])
  return desktop
}
```

The server render and the first client render both return `null`. So hydration never fails.
`<ClientOnly>` and `useHydrated()` are the other tools for this job.

### Streaming SSR

`src/routes/ssr.tsx` returns an unawaited promise from its loader:

```ts
loader: () => ({
  shellRenderedAt: new Date().toISOString(),
  report: getSlowReport(), // about 1.5 s — NOT awaited
})
```

It renders the promise with `<Await>` inside `<Suspense>`. React sends the shell immediately and
sends the rest later in the same response.

> **Bot user-agents are buffered on purpose.** `renderRouterToStream` calls `isbot(...)`. For
> crawlers it waits for the full stream. Test with a browser user-agent.

```bash
pnpm start:server &
curl -N -A "Mozilla/5.0 Chrome/140" http://127.0.0.1:3000/ssr
```

### Server functions

`createServerFn` turns a function into a typed RPC endpoint. During SSR it runs in the same process.
In the browser it becomes a network call. Zod schemas go into `.validator()`:

```ts
export const incrementCounter = createServerFn({ method: 'POST' })
  .validator(z.object({ by: z.number().int().min(1).max(10) }))
  .handler(async ({ data }) => {
    const current = await readCounter()
    return writeCounter({ value: current.value + data.by, updatedAt: new Date().toISOString() })
  })
```

The handler writes to `APP_DATA_DIR/server-state/counter.json`. In a packaged app this path is
inside Electron's per-user `userData` directory. Call `router.invalidate()` after a mutation.

### Server-only code

TanStack Start sends every file through **import protection**. By default:

- `**/*.server.*` cannot go into the client bundle.
- `@tanstack/react-start/server` is blocked in the client.
- `*.client.*` cannot go into the server bundle.
- The markers `import '@tanstack/react-start/server-only'` and `.../client-only'` do the same for
  other file names.

In development a violation warns and uses a mock. A production build fails.

`src/lib/counter.server.ts` is the example. It uses `node:fs`. The client only sees the RPC stub in
`src/lib/counter.ts`.

### Server routes

Use a server route for a plain HTTP endpoint, such as a webhook or a health check:

```ts
export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: () => Response.json({ ok: true, pid: process.pid }),
    },
  },
})
```

### React Server Components

RSC is experimental. To enable it, install `@vitejs/plugin-rsc` and `react-server-dom-webpack`, then
add `rsc()` and `rsc: { enabled: true }` to `vite.config.ts`. Use the helpers from
`@tanstack/react-start/rsc`:

| Helper                                                    | Use case                                         |
| --------------------------------------------------------- | ------------------------------------------------ |
| `renderServerComponent(<El />)`                           | Renders a component on the server and inlines it |
| `createCompositeComponent(fn)` + `<CompositeComponent>`   | Server component with client-filled slots        |

See `src/lib/rsc-demos.tsx`. If you do not need RSC, remove `rsc()` and the `rsc` option. The rest
of the app does not change.

## The Electron side

### Main process

`electron/src/main.ts` does four things:

- **Single instance lock** — a second launch focuses the open window.
- **`waitForUrl`** — polls the dev URL with a timeout.
- **Navigation guard** — blocks other origins and sends `window.open` targets to the system browser.
- **Window** — secure defaults, shown after `ready-to-show`.

### The in-process handler

`handler.ts` imports the built fetch handler. It is ESM, so the CJS bundle uses a dynamic
`import()`. Nitro's `standard` preset exports exactly `default { fetch }` and keeps static asset
serving in the bundle. `scripts/serve.mjs` runs the same handler on Node.

Because the handler is in the main process, server functions can call Electron APIs directly. Guard
those imports if you also build for the web.

### Preload and IPC

`src/lib/desktop-contract.ts` is the single source of truth for channel names and payload types.
The preload script, the main process, and the renderer all import it.

```ts
// electron/src/preload.ts
contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  invoke: {
    appInfo: () => ipcRenderer.invoke(IPC.invoke.appInfo),
    ping: (message) => ipcRenderer.invoke(IPC.invoke.ping, message),
    // ...
  },
  on: (event, listener) => { /* subscribe, and return an unsubscribe function */ },
})
```

In the renderer:

```tsx
const desktop = useDesktop()
await desktop.invoke.ping('hello') // → "pong: hello"
```

The handlers in `electron/src/ipc.ts` treat every argument as untrusted input. They parse URLs,
allow only `http(s)`, clean dialog filters, and check payload types.

### IPC or server function?

| Need                                              | Use             |
| ------------------------------------------------- | --------------- |
| Domain data, databases, files                     | server function |
| Code that is shared with a web deployment         | server function |
| Native dialogs, tray, menus, notifications, shell | IPC             |
| Window control, deep links, auto-update           | IPC             |
| A browser API                                     | client component |

A useful rule: if the code also makes sense on the web, use a server function. If it needs the user
machine, use IPC.

### Security defaults

| Setting            | Value   | Why                                                     |
| ------------------ | ------- | ------------------------------------------------------- |
| `contextIsolation` | `true`  | Page JavaScript cannot touch the preload realm.         |
| `sandbox`          | `true`  | The renderer runs in the operating system sandbox.      |
| `nodeIntegration`  | `false` | The page has no `require` and no `process`.             |
| `webSecurity`      | `true`  | The same-origin policy stays on.                        |
| navigation         | guarded | Other origins open in the system browser.               |

The renderer sees only the frozen object from `contextBridge`. See the Electron
[security checklist](https://www.electronjs.org/docs/latest/tutorial/security).

## Building and packaging

`electron-builder.yml` ships two things:

```yaml
files:                 # inside app.asar
  - build/**           # main.cjs and preload.cjs
  - package.json
  - '!node_modules/**' # nothing else is needed

extraResources:
  - from: .output      # the fetch handler and client assets
    to: app-server
```

The main bundle contains its dependencies. The handler is self-contained. So the package contains no
`node_modules`:

```
release/mac-arm64/TanStack Start Desktop.app/Contents/Resources/
├── app.asar              ~50 KB
└── app-server/           ~2.3 MB
```

Platform targets are in `electron-builder.yml` (`dmg` and `zip`, `nsis`, `AppImage` and `deb`). For
distribution, add an icon (`build-resources/icon.png`, 512×512 or larger) and code signing. See the
[electron-builder docs](https://www.electron.build/).

## Smoke test

`pnpm smoke` builds the app and runs it on the production handler. Then it drives the real renderer
through `webContents.executeJavaScript`:

```
✔ SSR HTML contains the hero heading
✔ preload bridge answers appInfo()
✔ client-side navigation + server function mutation
✔ React Server Components route renders
✔ streamed deferred data arrives
✔ streaming is not buffered
```

One run tests the in-process handler, SSR, hydration, client navigation, server-function RPC, RSC,
streaming over the protocol, and the preload bridge. Use it in CI on Linux with
`xvfb-run -a pnpm smoke`.

To run the same checks against the dev server:

```bash
pnpm dev:web &
ELECTRON_SMOKE_TEST=1 npx electron .
```

## Troubleshooting

| Symptom | Cause and fix |
| ------- | ------------- |
| `Port 3000 is already in use` | Another dev server is running. Run `lsof -ti :3000 \| xargs kill`. |
| `The SSR handler was not found … Run "pnpm build"` | The app selected the built handler, but `.output` is missing. Run `pnpm build`. |
| The app shows the dev server, but you built it | The app uses the dev server only when `NODE_ENV=development` or `ELECTRON_RENDERER_URL` is set. Unset them, or run `pnpm start`. |
| A page cannot read `document.cookie` | Expected. See [What the custom scheme changes](#what-the-custom-scheme-changes). |
| `Ignored build scripts: electron, esbuild, …` | pnpm blocks postinstall scripts by default. `pnpm-workspace.yaml` approves the needed ones. Run `pnpm approve-builds` if you add a package with scripts. |
| Streaming “does not work” with `curl` or Node `fetch` | TanStack Start buffers for bot user-agents on purpose. Test with `-A "Mozilla/5.0 …"`. |
| RSC build errors after an upgrade | RSC is experimental. Keep `@tanstack/react-start`, `@vitejs/plugin-rsc`, and `react-server-dom-webpack` in sync. |
| `verbatimModuleSyntax` warning | Keep this option disabled for TanStack Start. |
| Empty window in development | Electron waits up to 60 s for the dev URL. Look at the `[web]` lines in the `pnpm dev` output. |

## Web deployment

Only the `electron/` directory is Electron-specific. The same `vite build` output goes to any Nitro
target. The `standard` preset exports a fetch handler:

- **Node, Docker, Railway** — `node scripts/serve.mjs` (uses `srvx`)
- **Cloudflare** — `@cloudflare/vite-plugin` and `wrangler.jsonc`
- **Netlify or Vercel** — the matching Nitro preset or first-party Vite plugin

Server functions and RSC pages work on every target. Only the IPC bridge is desktop-only. It already
has a web fallback: `DesktopPanel` shows the "no IPC" state.

## Versions

Installed versions at the time of writing (all on `latest`):

| Package                    | Version         |
| -------------------------- | --------------- |
| `@tanstack/react-start`    | 1.168.52        |
| `@tanstack/react-router`   | 1.170.35        |
| `react` and `react-dom`    | 19.3.0          |
| `@vitejs/plugin-rsc`       | 0.5.34          |
| `react-server-dom-webpack` | 19.3.0          |
| `vite`                     | 8.3.0           |
| `nitro`                    | 3.0.260903-beta |
| `tailwindcss`              | 4.3.3           |
| `electron`                 | 44.3.0          |
| `electron-builder`         | 26.15.3         |
| `typescript`               | 7.0.2           |

## Further reading

- [TanStack Start docs](https://tanstack.com/start/latest/docs/framework/react/overview)
- [Build from scratch](https://tanstack.com/start/latest/docs/framework/react/build-from-scratch)
- [Server functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)
- [Server components](https://tanstack.com/start/latest/docs/framework/react/guide/server-components)
- [Hosting and Nitro](https://tanstack.com/start/latest/docs/framework/react/guide/hosting)
- [TanStack Router deferred data](https://tanstack.com/router/latest/docs/framework/react/guide/deferred-data-loading)
- [Electron security](https://www.electronjs.org/docs/latest/tutorial/security)
- [electron-builder](https://www.electron.build/)
