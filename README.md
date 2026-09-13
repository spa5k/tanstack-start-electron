# TanStack Start × Electron

Run TanStack Start v1 inside Electron. This repository gives you server-side rendering (SSR),
streaming, server functions, server routes, and experimental React Server Components. It also gives
you a typed IPC bridge with a sandboxed renderer.

The repository has two parts:

1. **A starter.** Run `pnpm dev` to get a desktop app with hot reload. Run `pnpm dist` to get an
   installer. All parts are built, packaged, and tested.
2. **A guide.** This document explains how the parts work together. It also explains how to extend
   them.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Electron (main)                     Electron (renderer / Chromium)     │
│  ├─ starts the SSR server  ────────► http://127.0.0.1:<random port>     │
│  │  (.output/server/index.mjs)       ├─ server-rendered HTML (SSR)      │
│  ├─ window / menu / dialogs          ├─ hydration turns HTML into React │
│  └─ ipcMain.handle(...)  ◄────────►  └─ window.desktop (contextBridge)  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Table of contents

- [Screenshots](#screenshots)
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

## Screenshots

Overview. The page shows the SSR snapshot and the live IPC panel:

![Overview page with the server snapshot and the Electron IPC panel](screenshots/overview.jpg)

Streaming SSR. The shell arrives first. The report streams in later:

![Streaming SSR page with the streamed report](screenshots/streaming-ssr.jpg)

Server functions. The counter is stored on the server:

![Server functions page with the filesystem counter](screenshots/server-functions.jpg)

React Server Components. Server markup wraps client islands:

![Server components page with composite RSC demos](screenshots/server-components.jpg)

## Feature matrix

| Capability                              | Where                                              | Status |
| --------------------------------------- | -------------------------------------------------- | ------ |
| File-based routing                      | `src/routes/**` (TanStack Router)                   | ✅      |
| SSR and hydration                       | `src/routes/__root.tsx`, `defaultStreamHandler`     | ✅      |
| Streaming SSR and deferred data         | `src/routes/ssr.tsx` (`<Await>`)                    | ✅      |
| Server functions (typed RPC)            | `src/lib/*.ts` (`createServerFn`)                   | ✅      |
| Server-only modules and import protection | `src/lib/counter.server.ts`                       | ✅      |
| Server routes (plain HTTP)              | `src/routes/api/health.ts`                          | ✅      |
| React Server Components (experimental)  | `src/routes/server-components.tsx`                  | ✅      |
| Server functions that write files       | `APP_DATA_DIR=counter.json` in Electron userData    | ✅      |
| Typed and sandboxed IPC bridge          | `src/lib/desktop-contract.ts`, preload              | ✅      |
| Hot reload for renderer and main process | `pnpm dev`                                         | ✅      |
| Self-contained production server        | `.output/` (Nitro `node-server`, about 2 MB)        | ✅      |
| Packaging for macOS, Windows, and Linux | `electron-builder.yml`                              | ✅      |
| End-to-end smoke test in Electron       | `pnpm smoke`                                        | ✅      |

## Requirements

- **Node.js 22 or newer.** This project is built and tested on Node 26.
- **pnpm 11 or newer.** You can also use npm, yarn, or bun. Use pnpm in CI.
- **macOS, Windows, or Linux** for development. You can package the app for all three systems.

> **Note about `pnpm-workspace.yaml`:** This file keeps the project as a single package. It also
> lists the packages that can run build scripts (`allowBuilds`). pnpm 11 blocks postinstall scripts
> by default. With this file, `pnpm install` works the same on a clean clone and in CI.

## Quick start

```bash
cd tanstack-start-electron
pnpm install
pnpm dev
```

`pnpm dev` starts three processes at the same time:

| Process      | Command                  | Port            |
| ------------ | ------------------------ | --------------- |
| Vite dev SSR | `vite dev`               | `3000`          |
| Main bundle  | `tsup --watch`           | —               |
| Desktop app  | `nodemon` → `electron .` | random loopback |

Electron asks `http://localhost:3000` until Vite answers. Then it opens the window. Open the network
tab and reload the page. The HTML comes from the SSR server, not from a static `index.html` file.

Now build the real app:

```bash
pnpm start      # builds, then opens the desktop app with the production server
pnpm smoke      # builds and checks every feature in the production app
pnpm dist       # makes installers in release/
```

`pnpm start` uses the built server in `.output/`. The dev server is used only by `pnpm dev`.

## Scripts

| Script                | What it does                                                              |
| --------------------- | ------------------------------------------------------------------------- |
| `pnpm dev`            | Runs Vite, tsup watch, and Electron together                              |
| `pnpm dev:web`        | Runs the Vite dev server only (`http://localhost:3000`)                   |
| `pnpm dev:desktop`    | Builds and watches the Electron main process, and runs the app            |
| `pnpm build`          | Runs `build:web`, then `build:electron`                                   |
| `pnpm build:web`      | Runs `vite build` and writes `.output/` (Nitro `node-server` preset)      |
| `pnpm build:electron` | Runs `tsup` and writes `build/main.cjs` and `build/preload.cjs`           |
| `pnpm typecheck`      | Checks the web app and the Electron code with TypeScript 7                 |
| `pnpm smoke`          | Builds everything and runs the end-to-end check inside Electron           |
| `pnpm dist`           | Packages installers for the current platform                              |
| `pnpm dist:dir`       | Packages an unpacked app directory (fast, for tests)                       |
| `pnpm start`          | Builds, then runs the desktop app on the built server                      |
| `pnpm start:server`   | Runs the production SSR server alone (`node .output/server/index.mjs`)    |
| `pnpm screenshots`    | Builds, then saves the README screenshots to `screenshots/`                |
| `pnpm preview`        | Runs the Vite preview server over the production build                    |

Environment variables:

| Variable                      | Effect                                                                 |
| ----------------------------- | ---------------------------------------------------------------------- |
| `ELECTRON_RENDERER_URL`       | Loads a different dev URL (default `http://localhost:3000`)             |
| `ELECTRON_FORCE_PRODUCTION=1` | Forces the built `.output` server, even with NODE_ENV=development      |
| `ELECTRON_SMOKE_TEST=1`       | Runs the smoke test and exits with a non-zero code on failure           |

## Project structure

```
tanstack-start-electron/
├── electron/
│   ├── src/
│   │   ├── main.ts          # app lifecycle, window, navigation guards
│   │   ├── server.ts        # starts .output/server/index.mjs (ELECTRON_RUN_AS_NODE)
│   │   ├── ipc.ts           # ipcMain.handle and input validation
│   │   ├── menu.ts          # application menu
│   │   ├── preload.ts       # contextBridge → window.desktop
│   │   └── smoke.ts         # end-to-end checks driven inside the renderer
│   ├── tsup.config.ts       # main and preload → build/*.cjs (no node_modules needed)
│   └── tsconfig.json
├── src/
│   ├── components/          # UI, the IPC playground, and client islands
│   ├── lib/
│   │   ├── counter.server.ts    # *.server.ts = never bundled for the browser
│   │   ├── counter.ts           # createServerFn RPC endpoints
│   │   ├── report.ts            # slow server function for the streaming demo
│   │   ├── rsc-demos.tsx        # renderServerComponent and createCompositeComponent
│   │   ├── server-info.ts       # reads request headers during SSR
│   │   ├── desktop-contract.ts  # shared IPC contract (types and channel names)
│   │   └── desktop-client.ts    # useDesktop() — SSR-safe bridge access
│   ├── routes/
│   │   ├── __root.tsx           # document shell, nav, devtools
│   │   ├── index.tsx            # overview and SSR snapshot
│   │   ├── ssr.tsx              # deferred data streamed into the page
│   │   ├── server-functions.tsx # filesystem counter and zod validation
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
└── pnpm-workspace.yaml          # keeps the project as a single package
```

## Architecture

### Why run a server inside a desktop app?

Most Electron apps are static SPAs. They call `loadFile('index.html')` and all code runs in Chromium.
This is sufficient until you need one of these features:

- **Server rendering** — the first paint is faster and the HTML is complete.
- **Secrets and private data** — the app can use database URLs, API keys, and license checks.
- **Large dependencies off the client** — markdown parsers and PDF tools stay on the server.
- **Server functions** — you read data without an HTTP API.
- **React Server Components** — the server renders components and the client keeps small
  interactive parts.
- **One code base for desktop and web** — the same server functions run on Node, Cloudflare, and
  Netlify.

Electron uses `file://` and HTTP. TanStack Start uses a `fetch` handler. So the build makes a
**self-contained Node server**, and Electron becomes its host:

1. Electron picks a free loopback port.
2. Electron starts the server.
3. Electron waits for `/api/health`.
4. Electron points the `BrowserWindow` at the server.

All requests stay on `127.0.0.1`.

### Development mode

```
pnpm dev
  ├─ vite dev (port 3000, HMR)  ◄──── electron loads http://localhost:3000
  ├─ tsup --watch → build/main.cjs
  └─ nodemon watches build/ → restarts electron
```

- The renderer uses full Vite HMR. A change to a route or a component appears immediately.
- A change to `electron/src/*.ts` rebuilds the main bundle. Then nodemon restarts the app.
- `electron/src/main.ts` calls `waitForUrl('http://localhost:3000')` before it opens the window. So
  you never see an empty window while Vite starts.
- `pnpm dev` sets `NODE_ENV=development`. That is the only reason the app uses the dev server. See
  [Production mode](#production-mode) for the other cases.

### Production mode

`pnpm start` builds the app and opens it on the built server. You can also run the steps by hand:

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
  └─ resources/app-server/            # ← .output copied with extraResources
       ├─ public/
       └─ server/index.mjs
```

The app selects the renderer like this:

| Condition                             | Renderer used          |
| ------------------------------------- | ---------------------- |
| Packaged app                          | built `.output` server |
| `NODE_ENV=development` (`pnpm dev`)   | Vite dev server        |
| `ELECTRON_RENDERER_URL` is set        | that URL               |
| Anything else, including `pnpm start` | built `.output` server |

The built server supports every feature: SSR, streaming, server functions, server routes, RSC, and
the IPC bridge. `pnpm smoke` checks them on the built server.

At runtime, the app does these steps:

1. `electron/src/server.ts` finds the server entry. An unpackaged run uses `.output`. A packaged app
   uses `resources/app-server`.
2. It asks `get-port-please` for a free port in the range `30011–50000`.
3. It starts **the Electron binary in Node mode**:

   ```bash
   ELECTRON_RUN_AS_NODE=1 <path-to-electron> .output/server/index.mjs
   ```

   You do not need Node on the user machine. Electron contains the runtime.
4. It passes this environment to the child process:
   - `PORT` and `NITRO_PORT`, with `HOST=127.0.0.1`
   - `APP_DATA_DIR=<app.getPath('userData')>` so server functions can write files
   - `NODE_ENV=production`
5. The main process waits for `/api/health`. Then it loads `http://127.0.0.1:<port>`.
6. On `will-quit`, and on process exit, the app kills the child process.

## The web app

### Routing

TanStack Router reads the files in `src/routes` and writes `src/routeTree.gen.ts`. Add a file and you
get a route. The root route uses the `shellComponent` slot to render the `<html>` document.
`<HeadContent />` and `<Scripts />` come from the router.

`src/router.tsx` holds the router defaults: `defaultPreload`, `scrollRestoration`, and the
not-found and error components. The `Register` interface makes `useNavigate`, `<Link to="...">`, and
similar APIs fully type-safe.

### SSR and hydration

Route `loader` functions are **isomorphic**. They run during SSR and during client-side navigation.
That is why the overview page calls a server function from its loader:

```ts
export const Route = createFileRoute('/')({
  loader: () => getServerSnapshot(),
  component: OverviewPage,
})
```

- During SSR, the handler runs in the same Node process. There is no HTTP request.
- After hydration, a return to `/` runs the loader again over the network as an RPC call.

Browser-only values must not run during the server render. `src/lib/desktop-client.ts` reads
`window` inside `useEffect`:

```ts
export function useDesktop(): DesktopApi | null {
  const [desktop, setDesktop] = useState<DesktopApi | null>(null)
  useEffect(() => setDesktop(window.desktop ?? null), [])
  return desktop
}
```

The server render and the first client render both return `null`. So hydration never fails.
`<ClientOnly>` and `useHydrated()` from `@tanstack/react-router` are the other tools for this job.

### Streaming SSR

`src/routes/ssr.tsx` returns an **unawaited** promise from its loader:

```ts
loader: () => ({
  shellRenderedAt: new Date().toISOString(),
  report: getSlowReport(), // about 1.5 s — NOT awaited
})
```

It renders the promise with `<Await>` inside `<Suspense>`:

```tsx
<Suspense fallback={<Skeleton lines={4} />}>
  <Await promise={report} fallback={<Skeleton lines={4} />}>
    {(data) => <ReportView data={data} />}
  </Await>
</Suspense>
```

React sends the shell immediately. It sends the resolved boundary later in the same response.

> **Bot user-agents are buffered on purpose.** `renderRouterToStream` calls
> `isbot(request.headers.get('user-agent'))`. For crawlers, it waits for `stream.allReady`. So
> `curl`, or `fetch` from Node without a user-agent, makes streaming look broken. Test with a
> browser user-agent. Electron's Chromium sends a browser user-agent.

```bash
curl -N -A "Mozilla/5.0 Chrome/140" http://127.0.0.1:<port>/ssr
```

### Server functions

`createServerFn` turns a function into a typed RPC endpoint. A component calls it like a normal
function. During SSR it runs in the same process. In the browser it becomes a network call. Zod
schemas go directly into `.validator()`:

```ts
export const incrementCounter = createServerFn({ method: 'POST' })
  .validator(z.object({ by: z.number().int().min(1).max(10) }))
  .handler(async ({ data }) => {
    const current = await readCounter()
    return writeCounter({ value: current.value + data.by, updatedAt: new Date().toISOString() })
  })
```

The handler writes to `APP_DATA_DIR/server-state/counter.json`. In a package, this path is inside
Electron's per-user `userData` directory. Call `router.invalidate()` after a mutation to run the
loaders again.

### Server-only code and import protection

TanStack Start sends every source file through **import protection**. The default rules are:

- A file that matches `**/*.server.*` cannot go into the client bundle.
- `@tanstack/react-start/server` is blocked in the client.
- A file that matches `*.client.*` cannot go into the server bundle.
- The markers `import '@tanstack/react-start/server-only'` and `import '@tanstack/react-start/client-only'`
  do the same job for files that do not match the naming convention.

In development, a violation shows a warning and uses a mock. **A production build fails.**

`src/lib/counter.server.ts` is the example. It uses `node:fs`. The client only sees the RPC stub in
`src/lib/counter.ts`.

### Server routes

Use a server route for a plain HTTP endpoint, such as a webhook, a health check, or a file download.
Define the route with a `server` property. `src/routes/api/health.ts` is also the readiness probe for
Electron:

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

To turn on RSC, do three steps:

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

| Helper                                                  | Use case                                         |
| ------------------------------------------------------- | ------------------------------------------------ |
| `renderServerComponent(<El />)`                         | Renders a component on the server and inlines it |
| `createCompositeComponent(fn)` + `<CompositeComponent>` | Server component with client-filled **slots**    |

A slot can be `children`, a render prop (the server sends data down), or a component prop (the client
component gets server data). See `src/lib/rsc-demos.tsx` and `src/routes/server-components.tsx`.

The router caches RSC values by route and params. Use `staleTime` and `loaderDeps` to change the
cache. Call `router.invalidate()` after a mutation. With TanStack Query, set
`structuralSharing: false` for RSC values.

> ⚠️ **RSC is experimental.** The API can change between minor versions. If you do not need RSC,
> remove `rsc()` from `vite.config.ts` and the `rsc: { enabled: true }` option. The rest of the app
> does not change.

## The Electron side

### Main process

`electron/src/main.ts` is small and careful:

- **Single instance lock** — a second launch focuses the open window. It does not start a second SSR
  server.
- **`waitForUrl`** — polls with a timeout. A slow dev server or a slow packaged server never gives
  an empty window.
- **Navigation guard** — `web-contents-created` blocks navigation to other origins. It sends
  `window.open` targets to the operating system browser.
- **Graceful shutdown** — `will-quit` and `process.once('exit')` kill the SSR child process.

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

The app adds `[ssr]` to the server output and sends it to the main console. This helps when a server
function throws in a packaged app.

### Preload and the typed IPC contract

`src/lib/desktop-contract.ts` is the **single source of truth**: channel names, payload types, and
the `DesktopApi` interface. The preload script, the main process, and the renderer all import it.
The file has no runtime dependencies, so it is safe everywhere.

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
  on: (event, listener) => { /* subscribe, and return an unsubscribe function */ },
})
```

In the renderer:

```tsx
const desktop = useDesktop()
await desktop.invoke.ping('hello') // → "pong: hello"
```

The handlers in `electron/src/ipc.ts` treat every argument as untrusted input. They parse URLs and
allow only `http(s)`. They clean the file-dialog filters. They check the payload types.

### IPC or server function?

| Need                                             | Use             |
| ------------------------------------------------ | --------------- |
| Domain data, databases, files                    | server function |
| Code that is shared with a web deployment        | server function |
| Native dialogs, tray, menus, notifications, shell | IPC            |
| Window control, deep links, auto-update          | IPC             |
| A browser API                                    | client component |

A useful rule: **if the code also makes sense on the web, use a server function. If the code needs
the user machine, use IPC.**

### Security defaults

The generated `BrowserWindow` uses these settings:

| Setting            | Value   | Why                                                     |
| ------------------ | ------- | ------------------------------------------------------- |
| `contextIsolation` | `true`  | Page JavaScript cannot touch the preload realm.         |
| `sandbox`          | `true`  | The renderer runs in the operating system sandbox.      |
| `nodeIntegration`  | `false` | The page has no `require` and no `process`.             |
| `webSecurity`      | `true`  | The same-origin policy stays on.                        |
| navigation         | guarded | Other origins open in the operating system browser.     |

The renderer sees only the frozen object from `contextBridge`. See the Electron
[security checklist](https://www.electronjs.org/docs/latest/tutorial/security).

## Building and packaging

`electron-builder.yml` ships three things:

```yaml
files:                 # inside app.asar
  - build/**           # main.cjs and preload.cjs (all dependencies are inlined)
  - package.json
  - '!node_modules/**' # nothing else is needed

extraResources:
  - from: .output      # the self-contained Nitro server
    to: app-server
```

The main bundle contains all its dependencies. The SSR server is self-contained. So the package does
not contain `node_modules`. A build looks like this:

```
release/mac-arm64/TanStack Start Desktop.app/Contents/Resources/
├── app.asar              ~50 KB   (main, preload, package.json)
└── app-server/           ~2.3 MB  (SSR server and client assets)
```

Platform targets are in `electron-builder.yml` (`dmg` and `zip`, `nsis`, `AppImage` and `deb`). For
distribution, add an app icon (`build-resources/icon.png`, 512×512 or larger) and code signing
configuration. See the [electron-builder docs](https://www.electron.build/).

> **The app does not use `file://`.** The renderer always loads from `http://127.0.0.1:<port>`. SSR,
> server functions, RSC, and streaming need a real HTTP origin. This also removes `file://` CORS
> problems. Cookies work, and `fetch('/api/...')` is valid.

## Smoke test

`pnpm smoke` builds the app. Then it uses the production server path, even when the app is not
packaged. Then it drives the real renderer through `webContents.executeJavaScript`:

```
✔ SSR HTML contains the hero heading
✔ preload bridge answers appInfo()
✔ client-side navigation + server function mutation
✔ React Server Components route renders
✔ streamed deferred data arrives
```

One run tests the Nitro server, SSR, hydration, TanStack Router client navigation, server-function
RPC, the RSC Flight pipeline, streaming, and the preload bridge. Use it in CI on Linux with
`xvfb-run -a pnpm smoke`.

To run the same checks against the dev server:

```bash
pnpm dev:web &                       # in another shell
ELECTRON_SMOKE_TEST=1 npx electron . # uses the running dev server
```

## Troubleshooting

| Symptom | Cause and fix |
| ------- | ------------- |
| `Port 3000 is already in use` | Another dev server is running. Run `lsof -ti :3000 \| xargs kill`. `strictPort` is on, so the URL that Electron waits for never changes. |
| `The SSR server bundle was not found … Run "pnpm build"` | The app selected the built server, but `.output` is missing. Run `pnpm build`. |
| The app shows the dev server, but you built it | The app uses the dev server only when `NODE_ENV=development` or `ELECTRON_RENDERER_URL` is set. Unset them, or run `pnpm start`. |
| `Ignored build scripts: electron, esbuild, …` (pnpm 10 or 11) | pnpm blocks postinstall scripts by default. `pnpm-workspace.yaml` already approves the needed packages (`allowBuilds`). Run `pnpm approve-builds` if you add a package with scripts. |
| Streaming "does not work" with `curl` or Node `fetch` | TanStack Start buffers for bot user-agents on purpose. Test with `-A "Mozilla/5.0 …"`. |
| RSC build errors after an upgrade | RSC is experimental. Keep `@tanstack/react-start`, `@vitejs/plugin-rsc`, and `react-server-dom-webpack` at the versions in `package.json`. |
| `verbatimModuleSyntax` warning | Keep this option disabled for TanStack Start. |
| Empty window in development | Electron waits up to 60 s for the dev URL. Look at the `[web]` lines in the `pnpm dev` output. |
| A stale SSR server stays after a hard kill | `server.ts` kills the child on `will-quit` and on process exit. After `kill -9`, run `pkill -f .output/server/index.mjs`. |
| electron-builder warns about `duplicate dependency references` or platform binaries | This is safe here. The package contains no `node_modules`, so the warning only concerns build tools. |

## Deploying the web version

Only the `electron/` directory is Electron-specific. The same `vite build` output goes to any Nitro
target. Add or change a preset in `vite.config.ts`:

- **Node, Docker, Railway** — the preset in this repository: `node .output/server/index.mjs`
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
- [Server entry point](https://tanstack.com/start/latest/docs/framework/react/guide/server-entry-point)
- [Server components](https://tanstack.com/start/latest/docs/framework/react/guide/server-components)
- [Hosting and Nitro](https://tanstack.com/start/latest/docs/framework/react/guide/hosting)
- [TanStack Router deferred data](https://tanstack.com/router/latest/docs/framework/react/guide/deferred-data-loading)
- [Electron security](https://www.electronjs.org/docs/latest/tutorial/security)
- [electron-builder](https://www.electron.build/)
