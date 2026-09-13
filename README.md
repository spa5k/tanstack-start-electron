# TanStack Start × Electron

> **TanStack Start v1 running inside Electron** with SSR, streaming, server functions, server
> routes and experimental React Server Components — plus a typed, sandboxed IPC bridge.

This is the successor to [`nextjs_approuter_electron`](https://github.com/spa5k/nextjs_approuter_electron)
and it is two things at once:

1. **A runnable starter** — `pnpm dev` gives you a hot-reloading desktop app; `pnpm dist` gives you a
   ready-to-package installer. Every piece has been built, packaged and smoke-tested.
2. **A guide** — this document explains how the pieces fit together, why they are arranged this
   way, and how to extend the setup.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Electron (main)                     Electron (renderer / Chromium)     │
│  ├─ spawns the SSR server  ───────►  http://127.0.0.1:<random port>     │
│  │  (.output/server/index.mjs)       ├─ server-rendered HTML (SSR)      │
│  ├─ window / menu / dialogs          ├─ hydrates into a React app       │
│  └─ ipcMain.handle(...)  ◄────────►  └─ window.desktop (contextBridge)  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Table of contents

- [Feature matrix](#feature-matrix)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Architecture](#architecture)
  - [Why run a server inside a desktop app?](#why-run-a-server-inside-a-desktop-app)
  - [Development mode](#development-mode)
  - [Production mode](#production-mode)
- [The web app](#the-web-app)
  - [Routing](#routing)
  - [SSR and hydration](#ssr-and-hydration)
  - [Streaming SSR](#streaming-ssr)
  - [Server functions](#server-functions)
  - [Server-only code and import protection](#server-only-code-and-import-protection)
  - [Server routes](#server-routes)
  - [React Server Components](#react-server-components)
- [The Electron side](#the-electron-side)
  - [Main process](#main-process)
  - [The SSR server child process](#the-ssr-server-child-process)
  - [Preload and the typed IPC contract](#preload-and-the-typed-ipc-contract)
  - [IPC or server function?](#ipc-or-server-function)
  - [Security defaults](#security-defaults)
- [Building and packaging](#building-and-packaging)
- [Smoke test](#smoke-test)
- [Troubleshooting](#troubleshooting)
- [Deploying the web version](#deploying-the-web-version)
- [Versions](#versions)
- [Further reading](#further-reading)

## Feature matrix

| Capability                              | Where                                              | Status |
| --------------------------------------- | -------------------------------------------------- | ------ |
| File-based routing                      | `src/routes/**` (TanStack Router)                   | ✅      |
| SSR + hydration                         | `src/routes/__root.tsx`, `defaultStreamHandler`     | ✅      |
| Streaming SSR + deferred data           | `src/routes/ssr.tsx` (`<Await>`)                    | ✅      |
| Server functions (typed RPC)            | `src/lib/*.ts` (`createServerFn`)                   | ✅      |
| Server-only modules + import protection | `src/lib/counter.server.ts`                         | ✅      |
| Server routes (raw HTTP)                | `src/routes/api/health.ts`                          | ✅      |
| React Server Components (experimental)  | `src/routes/server-components.tsx`                  | ✅      |
| Server functions writing real files     | `APP_DATA_DIR=counter.json` in Electron userData    | ✅      |
| Typed, sandboxed IPC bridge             | `src/lib/desktop-contract.ts`, preload              | ✅      |
| Hot reload (renderer + main process)    | `pnpm dev`                                          | ✅      |
| Self-contained production server        | `.output/` (Nitro `node-server`, ~2 MB)             | ✅      |
| Packaging for macOS / Windows / Linux   | `electron-builder.yml`                              | ✅      |
| End-to-end smoke test in Electron       | `pnpm smoke`                                        | ✅      |

## Requirements

- **Node.js 22+** (built and tested on Node 26)
- **pnpm 11+** (npm/yarn/bun work too, but `pnpm install` is what CI should use)
- macOS, Windows or Linux for development; any of the three for packaging

> **Why does this repo have its own `pnpm-workspace.yaml`?** It keeps the project a single-package
> workspace with explicit `allowBuilds` approvals (pnpm 11 blocks postinstall scripts by default),
> so `pnpm install` behaves identically on a clean clone and in CI.

## Quick start

```bash
cd tanstack-start-electron
pnpm install
pnpm dev
```

`pnpm dev` starts three things at once:

| Process      | Command                    | Port              |
| ------------ | -------------------------- | ----------------- |
| Vite dev SSR | `vite dev`                 | `3000`            |
| Main bundle  | `tsup --watch`             | —                 |
| Desktop app  | `nodemon` → `electron .`   | random loopback   |

Electron polls `http://localhost:3000` until Vite answers, then opens a window. Turn on the
network tab and reload: the HTML comes from the SSR server, not from a static `index.html`.

Then build the real thing:

```bash
pnpm build      # .output/ (SSR server) + build/ (main + preload)
pnpm smoke      # builds, boots the production server, drives the UI, asserts the result
pnpm dist       # electron-builder installers into release/
```

## Scripts

| Script                    | What it does                                                              |
| ------------------------- | ------------------------------------------------------------------------- |
| `pnpm dev`                | Vite + tsup watch + Electron together                                     |
| `pnpm dev:web`            | Vite dev server only (`http://localhost:3000`)                            |
| `pnpm dev:desktop`        | Electron main build/watch + app                                            |
| `pnpm build`              | `build:web` then `build:electron`                                          |
| `pnpm build:web`          | `vite build` → `.output/` (Nitro `node-server` preset)                     |
| `pnpm build:electron`     | `tsup` → `build/main.cjs`, `build/preload.cjs`                             |
| `pnpm typecheck`          | TypeScript 7 for the web app **and** the Electron code                     |
| `pnpm smoke`              | Build everything and run the end-to-end check inside Electron             |
| `pnpm dist`               | Package installers for the current platform                               |
| `pnpm dist:dir`           | Package an unpacked `.app` / directory (fast iteration)                   |
| `pnpm start`              | Run the production SSR server standalone (`node .output/server/index.mjs`) |
| `pnpm preview`            | Vite's preview server over the production build                           |

Useful environment variables:

| Variable                      | Effect                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `ELECTRON_RENDERER_URL`       | Load a different dev URL (default `http://localhost:3000`)                    |
| `ELECTRON_FORCE_PRODUCTION=1` | Use the built `.output` server even when the app is unpackaged                |
| `ELECTRON_SMOKE_TEST=1`       | Run the smoke test and exit with a non-zero code on failure                   |

## Project structure

```
tanstack-start-electron/
├── electron/
│   ├── src/
│   │   ├── main.ts          # app lifecycle, window, navigation guards
│   │   ├── server.ts        # spawns .output/server/index.mjs (ELECTRON_RUN_AS_NODE)
│   │   ├── ipc.ts           # ipcMain.handle + input validation
│   │   ├── menu.ts          # application menu
│   │   ├── preload.ts       # contextBridge → window.desktop
│   │   └── smoke.ts         # end-to-end assertions driven inside the renderer
│   ├── tsup.config.ts       # main/preload → build/*.cjs (no node_modules required)
│   └── tsconfig.json
├── src/
│   ├── components/          # UI + the IPC playground and client islands
│   ├── lib/
│   │   ├── counter.server.ts    # *.server.ts = never bundled for the browser
│   │   ├── counter.ts           # createServerFn RPC endpoints
│   │   ├── report.ts            # slow server function used to demo streaming
│   │   ├── rsc-demos.tsx        # renderServerComponent / createCompositeComponent
│   │   ├── server-info.ts       # reads request headers during SSR
│   │   ├── desktop-contract.ts  # shared IPC contract (types + channel names)
│   │   └── desktop-client.ts    # useDesktop() — SSR-safe bridge access
│   ├── routes/
│   │   ├── __root.tsx           # document shell, nav, devtools
│   │   ├── index.tsx            # overview + SSR snapshot
│   │   ├── ssr.tsx              # deferred data streamed into the page
│   │   ├── server-functions.tsx # filesystem-backed counter + zod validation
│   │   ├── server-components.tsx# RSC demos
│   │   └── api/health.ts        # server route used as a readiness probe
│   ├── routeTree.gen.ts         # generated by the router plugin
│   ├── router.tsx
│   ├── server.ts                # optional custom server entry
│   └── styles/app.css           # Tailwind v4
├── vite.config.ts
├── electron-builder.yml
├── nodemon.json
├── Makefile
└── pnpm-workspace.yaml          # keeps this folder standalone
```

## Architecture

### Why run a server inside a desktop app?

Electron apps are usually static SPAs: `loadFile('index.html')` and everything runs in Chromium.
That works until you need:

- **Real server rendering** — faster first paint, SEO-grade HTML, no client-side data waterfall.
- **Secrets and privileged data** — database URLs, API keys, license checks.
- **Heavy dependencies off the client** — markdown parsers, syntax highlighters, PDF tooling.
- **Server functions** — colocated, typed data access without inventing an HTTP API.
- **React Server Components** — server-rendered components with client islands.
- **Code you can also deploy to the web** — the exact same `src/lib` server functions run on Node,
  Cloudflare, Netlify, etc.

The catch is that Electron speaks `file://` and HTTP — not TanStack Start's `fetch` handler. So the
build produces a **self-contained Node server** and Electron becomes its host: it picks a free
loopback port, spawns the server, waits for `/api/health`, and points the `BrowserWindow` at it.
Requests never leave `127.0.0.1`.

### Development mode

```
pnpm dev
  ├─ vite dev (port 3000, HMR)  ◄──── electron loads http://localhost:3000
  ├─ tsup --watch → build/main.cjs
  └─ nodemon watches build/ → restarts electron
```

- The renderer gets full Vite HMR; editing a route or a component updates instantly.
- Editing `electron/src/*.ts` rebuilds the main bundle and nodemon restarts the app.
- `electron/src/main.ts` calls `waitForUrl('http://localhost:3000')` before opening the window, so
  you never see a blank window while Vite boots.

### Production mode

```
pnpm build
  ├─ vite build
  │    ├─ .output/public/          # client assets (HTML entry, JS, CSS)
  │    ├─ .output/server/index.mjs # Node server (Nitro node-server preset)
  │    └─ .output/nitro.json
  └─ tsup → build/main.cjs, build/preload.cjs

pnpm dist → electron-builder
  ├─ app.asar
  │    ├─ build/main.cjs, build/preload.cjs
  │    └─ package.json                # no node_modules at all
  └─ resources/app-server/            # ← .output copied via extraResources
       ├─ public/
       └─ server/index.mjs
```

At runtime:

1. `electron/src/server.ts` finds the server entry (`.output` in dev, `resources/app-server` when
   packaged).
2. It asks `get-port-please` for a free port in `30011–50000`.
3. It spawns **Electron's own binary in Node mode**:

   ```bash
   ELECTRON_RUN_AS_NODE=1 <path-to-electron> .output/server/index.mjs
   ```

   No system Node installation is required — Electron ships the runtime.
4. Environment passed to the child:
   - `PORT` / `NITRO_PORT` and `HOST=127.0.0.1`
   - `APP_DATA_DIR=<app.getPath('userData')>` so server functions can write real files
   - `NODE_ENV=production`
5. Main waits for `/api/health`, then loads `http://127.0.0.1:<port>`.
6. On `will-quit` (and on process exit) the child is killed.

## The web app

### Routing

TanStack Router's file-based routing generates `src/routeTree.gen.ts` from the files in
`src/routes`. Add a file, get a route. The root route uses the `shellComponent` slot to render the
`<html>` document, with `<HeadContent />` and `<Scripts />` coming from the router.

`src/router.tsx` is where router-level defaults live (`defaultPreload`, `scrollRestoration`,
not-found/error components). The `Register` interface makes `useNavigate`, `<Link to="...">` and
friends fully type-safe.

### SSR and hydration

Route `loader`s are **isomorphic**: they run during SSR *and* on client-side navigation. That is why
the Overview page calls a server function from its loader:

```ts
export const Route = createFileRoute('/')({
  loader: () => getServerSnapshot(),
  component: OverviewPage,
})
```

- During SSR the handler executes in the same Node process — no HTTP hop.
- After hydration, navigating back to `/` re-runs the loader over the network as an RPC call.

Browser-only values must not run during the server render. The pattern used by
`src/lib/desktop-client.ts` is to read `window` inside `useEffect`:

```ts
export function useDesktop(): DesktopApi | null {
  const [desktop, setDesktop] = useState<DesktopApi | null>(null)
  useEffect(() => setDesktop(window.desktop ?? null), [])
  return desktop
}
```

Server and first client render both return `null`, so hydration never mismatches. `<ClientOnly>` and
`useHydrated()` from `@tanstack/react-router` are the other two tools in this toolbox.

### Streaming SSR

`src/routes/ssr.tsx` returns an **unawaited** promise from its loader:

```ts
loader: () => ({
  shellRenderedAt: new Date().toISOString(),
  report: getSlowReport(), // ~1.5s — NOT awaited
})
```

and renders it with `<Await>` inside `<Suspense>`:

```tsx
<Suspense fallback={<Skeleton lines={4} />}>
  <Await promise={report} fallback={<Skeleton lines={4} />}>
    {(data) => <ReportView data={data} />}
  </Await>
</Suspense>
```

React flushes the shell immediately and streams the resolved boundary later in the same response.

> **Bot user-agents are buffered on purpose.** `renderRouterToStream` checks
> `isbot(request.headers.get('user-agent'))` and waits for `stream.allReady` for crawlers, so
> `curl` (and `fetch` from Node without a UA) will *look* like streaming is broken. Test with a
> browser-like UA — that is also what Electron's Chromium sends:

```bash
curl -N -A "Mozilla/5.0 Chrome/140" http://127.0.0.1:<port>/ssr
```

### Server functions

`createServerFn` turns a function into a typed RPC endpoint. From a component it is a network call;
during SSR it runs in-process. Zod schemas plug straight into `.validator()`:

```ts
export const incrementCounter = createServerFn({ method: 'POST' })
  .validator(z.object({ by: z.number().int().min(1).max(10) }))
  .handler(async ({ data }) => {
    const current = await readCounter()
    return writeCounter({ value: current.value + data.by, updatedAt: new Date().toISOString() })
  })
```

The handler writes to `APP_DATA_DIR/server-state/counter.json` — Electron's per-user `userData`
directory in the packaged app. Call `router.invalidate()` after a mutation to re-run loaders.

### Server-only code and import protection

TanStack Start runs every source file through **import protection**. By default:

- `**/*.server.*` files cannot be imported into the client bundle.
- `@tanstack/react-start/server` is denied in the client.
- `.client.*` files cannot leak into the server bundle (and `import '@tanstack/react-start/server-only'` /
  `.../client-only'` markers do the same for files that don't match the naming convention).

In dev violations are mocked with a warning; **production builds fail**. `src/lib/counter.server.ts`
is the example: it uses `node:fs`, and the client only ever sees the RPC stub defined in
`src/lib/counter.ts`.

### Server routes

For raw HTTP endpoints (webhooks, health checks, file downloads) define a route with a `server`
property. `src/routes/api/health.ts` doubles as the Electron readiness probe:

```ts
export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: () => Response.json({ ok: true, pid: process.pid, ... }),
    },
  },
})
```

### React Server Components

RSC is enabled through three things:

```bash
pnpm add -D @vitejs/plugin-rsc react-server-dom-webpack
```

```ts
// vite.config.ts
plugins: [
  tanstackStart({ srcDirectory: 'src', rsc: { enabled: true } }),
  rsc(),        // must come after tanstackStart()
  viteReact(),  // must come after start's plugin
  nitro(),
]
```

Then use the helpers from `@tanstack/react-start/rsc`:

| Helper                                                | Use case                                            |
| ----------------------------------------------------- | --------------------------------------------------- |
| `renderServerComponent(<El />)`                       | Server-render a component, inline it as a node      |
| `createCompositeComponent(fn)` + `<CompositeComponent>` | Server component with client-filled **slots**    |

Slots can be `children`, render props (server passes data down), or component props (client
components receive server data). See `src/lib/rsc-demos.tsx` and `src/routes/server-components.tsx`.

Caching is handled by the router (keyed by route + params, tunable with `staleTime`/`loaderDeps`);
call `router.invalidate()` after mutations. With TanStack Query, set
`structuralSharing: false` for RSC values.

> ⚠️ **RSC is experimental.** The API may change between minor versions. If you do not need it,
> remove `rsc()` from `vite.config.ts` and the `rsc: { enabled: true }` option; the rest of the app
> is unaffected.

## The Electron side

### Main process

`electron/src/main.ts` is deliberately small and opinionated:

- **Single instance lock** — a second launch focuses the existing window instead of starting a
  second SSR server.
- **`waitForUrl`** — polls with a timeout so a slow dev server, or a slow packaged server, never
  produces a blank window.
- **Navigation guard** — `web-contents-created` denies navigation to unexpected origins and sends
  `window.open` targets to the OS browser.
- **Graceful shutdown** — `will-quit` and `process.once('exit')` kill the SSR child.

### The SSR server child process

```ts
const child = spawn(process.execPath, [entry], {
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    NODE_ENV: 'production',
    PORT: String(port),
    HOST: '127.0.0.1',
    APP_DATA_DIR: app.getPath('userData'),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})
```

Server stdout/stderr is prefixed with `[ssr]` and forwarded to the main console — useful when a
server function throws in a packaged app.

### Preload and the typed IPC contract

`src/lib/desktop-contract.ts` is the **single source of truth**: channel names, payload types and
the `DesktopApi` interface. It is imported by the preload script, by the main process and by the
renderer. Because it has no runtime dependencies it is safe everywhere.

```ts
// electron/src/preload.ts
contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  invoke: {
    appInfo: () => ipcRenderer.invoke(IPC.invoke.appInfo),
    ping: (message) => ipcRenderer.invoke(IPC.invoke.ping, message),
    openExternal: (url) => ipcRenderer.invoke(IPC.invoke.openExternal, url),
    pickFile: (options) => ipcRenderer.invoke(IPC.invoke.pickFile, options),
  },
  on: (event, listener) => { /* subscribe + return unsubscribe */ },
})
```

In the renderer:

```tsx
const desktop = useDesktop()
await desktop.invoke.ping('hello') // → "pong: hello"
```

Handlers in `electron/src/ipc.ts` treat every argument as untrusted input: URLs are parsed and
restricted to `http(s)`, file-dialog filters are sanitised, payloads are type-checked.

### IPC or server function?

| Need                                                | Use                |
| --------------------------------------------------- | ------------------ |
| Domain data, databases, files                       | server function    |
| Code shared with a web deployment                   | server function    |
| Native dialogs, tray, menus, notifications, shell   | IPC                |
| Window control, deep links, auto-update             | IPC                |
| Anything that needs a browser API                    | client component   |

A useful rule: **if it would still make sense on the web, it belongs in a server function; if it
needs the user's machine, it belongs in IPC.**

### Security defaults

The generated `BrowserWindow` uses:

| Setting            | Value  | Why                                                        |
| ------------------ | ------ | ---------------------------------------------------------- |
| `contextIsolation` | `true` | page JS cannot touch the preload's realm                   |
| `sandbox`          | `true` | renderer runs in the OS sandbox                            |
| `nodeIntegration`  | `false`| no `require`/`process` in the page                         |
| `webSecurity`      | `true` | same-origin policy stays on                                |
| navigation         | guarded| unexpected origins open in the OS browser, never in-app    |

The renderer only sees the frozen object exposed by `contextBridge`. See Electron's
[security checklist](https://www.electronjs.org/docs/latest/tutorial/security).

## Building and packaging

`electron-builder.yml` ships three things:

```yaml
files:                 # inside app.asar
  - build/**           # main.cjs + preload.cjs (everything inlined)
  - package.json
  - '!node_modules/**' # nothing else is needed

extraResources:
  - from: .output      # the self-contained Nitro server
    to: app-server
```

Because the main process bundle inlines its dependencies and the SSR server is self-contained,
**no `node_modules` are packaged**. A build looks like this:

```
release/mac-arm64/TanStack Start Desktop.app/Contents/Resources/
├── app.asar              ~50 KB   (main, preload, package.json)
└── app-server/           ~2.3 MB  (SSR server + client assets)
```

Platform targets live in `electron-builder.yml` (`dmg`+`zip`, `nsis`, `AppImage`+`deb`). For
distribution you will want an app icon (`build-resources/icon.png`, 512×512+) and code signing
configuration. See the [electron-builder docs](https://www.electron.build/).

> **Serving files with `file://` is not supported.** The renderer is always loaded over
> `http://127.0.0.1:<port>` because SSR, server functions, RSC and streaming all need a real HTTP
> origin. This also means no `file://` CORS quirks, cookies work, and `fetch('/api/...')` is valid.

## Smoke test

`pnpm smoke` builds the app, forces the production server path (even when unpackaged), and drives
the real renderer through `webContents.executeJavaScript`:

```
✔ SSR HTML contains the hero heading
✔ preload bridge answers appInfo()
✔ client-side navigation + server function mutation
✔ React Server Components route renders
✔ streamed deferred data arrives
```

That single run exercises: the Nitro server, SSR, hydration, TanStack Router client navigation,
server-function RPC, the RSC Flight pipeline, streaming and the preload bridge. Use it in CI on
Linux with `xvfb-run -a pnpm smoke`.

To test the same checks against the dev server instead:

```bash
pnpm dev:web &                        # in another shell
ELECTRON_SMOKE_TEST=1 npx electron .  # uses the running dev server
```

## Troubleshooting

| Symptom | Cause / fix |
| ------- | ----------- |
| `Port 3000 is already in use` | Another dev server is running: `lsof -ti :3000 \| xargs kill`. `strictPort` is on so the URL Electron waits for never drifts. |
| `The SSR server bundle was not found … Run "npm run build:web"` | The packaged/prod path was requested before building. Run `pnpm build` or use `pnpm dev` for the dev path. |
| `app.isPackaged` is false but you want production behavior | `ELECTRON_FORCE_PRODUCTION=1 electron .` — the same switch `pnpm smoke` uses. |
| `Ignored build scripts: electron, esbuild, …` (pnpm 10/11) | pnpm blocks postinstall scripts by default. `pnpm-workspace.yaml` already approves the needed ones (`allowBuilds`); run `pnpm approve-builds` if you add packages with scripts. |
| Streaming “does not work” with `curl` / Node `fetch` | Start buffers for bot user-agents on purpose — test with `-A "Mozilla/5.0 …"`. |
| RSC build errors after upgrading | RSC is experimental; keep `@tanstack/react-start`, `@vitejs/plugin-rsc` and `react-server-dom-webpack` in sync with the versions in `package.json`, and see the docs link below. |
| `verbatimModuleSyntax` warning | Keep it disabled for TanStack Start. |
| Blank window in dev | Electron waits up to 60s for the dev URL; check the `[web]` lines in the `pnpm dev` output. |
| Stale SSR server after a hard kill | `server.ts` kills the child on `will-quit` and `process.exit`; if you kill `-9` the OS will reap it, but you can also `pkill -f .output/server/index.mjs`. |
| electron-builder warns about `duplicate dependency references` / platform binaries | Harmless for this setup: nothing from `node_modules` is packaged, so the warning only concerns build-time tooling. |

## Deploying the web version

Nothing here is Electron-specific except `electron/`. The same `vite build` output deploys to any
Nitro target. Swap or add a preset in `vite.config.ts`:

- **Node / Docker / Railway** — what this repo uses: `node .output/server/index.mjs`
- **Cloudflare** — `@cloudflare/vite-plugin` + `wrangler.jsonc` (see the hosting guide)
- **Netlify / Vercel** — the corresponding Nitro preset or first-party Vite plugin

Server functions and RSC pages work on every target; only the IPC bridge is desktop-only, and it is
already written to render a graceful web fallback (`DesktopPanel` shows the “no IPC” state).

## Versions

Installed at the time of writing (all on `latest`):

| Package                     | Version         |
| --------------------------- | --------------- |
| `@tanstack/react-start`     | 1.168.52        |
| `@tanstack/react-router`    | 1.170.35        |
| `react` / `react-dom`       | 19.3.0          |
| `@vitejs/plugin-rsc`        | 0.5.34          |
| `react-server-dom-webpack`  | 19.3.0          |
| `vite`                      | 8.3.0           |
| `nitro`                     | 3.0.260903-beta |
| `tailwindcss`               | 4.3.3           |
| `electron`                  | 44.3.0          |
| `electron-builder`          | 26.15.3         |
| `typescript`                | 7.0.2           |

## Further reading

- [TanStack Start docs](https://tanstack.com/start/latest/docs/framework/react/overview)
- [Build from scratch](https://tanstack.com/start/latest/docs/framework/react/build-from-scratch)
- [Server functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)
- [Server entry point](https://tanstack.com/start/latest/docs/framework/react/guide/server-entry-point)
- [Server components](https://tanstack.com/start/latest/docs/framework/react/guide/server-components)
- [Hosting & Nitro](https://tanstack.com/start/latest/docs/framework/react/guide/hosting)
- [TanStack Router deferred data](https://tanstack.com/router/latest/docs/framework/react/guide/deferred-data-loading)
- [Electron security](https://www.electronjs.org/docs/latest/tutorial/security)
- [electron-builder](https://www.electron.build/)
