# Full-Stack React in Electron — With SSR, RSC, and No Open Ports

### How TanStack Start and a custom `app://` protocol removed the hidden web server from my desktop app

Every Electron app that renders React on the server hides a web server.

It starts on a random localhost port. The window loads that URL. Everything works — until the firewall
asks the user a question, the port collides with something else, or another local process finds your
app's server and starts talking to it.

I maintain a Next.js + Electron boilerplate. It works, and the server is the part I always disliked.
So when I migrated the project to TanStack Start, I decided to remove the server. Not the rendering —
the *socket*.

This is the story of how it works, and the four sharp edges I hit on the way.

---

## What the app does

The project is a starter for full-stack React in a desktop shell. It has:

- **SSR** — the server renders the HTML, React hydrates it.
- **Streaming** — slow data arrives after the shell, in the same response.
- **Server functions** — typed RPC with zod validation, no API layer.
- **Server routes** — plain HTTP endpoints when you need them.
- **React Server Components** — experimental, with client slots.
- **IPC** — a typed, sandboxed `window.desktop` bridge.

![Overview page with an SSR snapshot and the IPC panel](screenshots/overview.jpg)

The important part: the exact same server code builds for the web. The desktop app is just one host
of the handler.

---

## The hidden server problem

The classic approach is simple. Build a standalone Node server, spawn it from the Electron main
process, wait for `/api/health`, then point the window at `http://127.0.0.1:<port>`.

I ran that for two years. It is fine, but the port stays open for the whole session, and that has
real costs:

- **Firewall and antivirus prompts.** On Windows, a new listening socket is a new dialog.
- **Port collisions.** Rare, but they happen, and they are annoying to debug.
- **Local attack surface.** Any process on the machine can call your app's server. Your server
  functions are now a local API.
- **Two runtimes.** The main process and the server process have separate memory, and server code
  cannot touch Electron APIs.

Then I read about [`next-electron-rsc`](https://github.com/kirill-konshin/next-electron-rsc) by Kirill
Konshin. Its idea is elegant: **run the framework's request handler inside the Electron main process,
and serve the renderer over a custom protocol.** No port. No child process.

I wanted the same thing for TanStack Start.

---

## Step 1: get a fetch handler

TanStack Start builds with Nitro. The default `node-server` preset emits a file that starts
listening when you import it. That is the opposite of what I needed.

Nitro also ships a `standard` preset. It exports exactly what I wanted:

```js
// .output/server/index.mjs
export default { fetch: useNitroApp().fetch }
```

A plain fetch handler. No listener. Static asset serving stays in the bundle when I enable it:

```ts
// vite.config.ts
nitro({
  preset: 'standard',
  serveStatic: true,
}),
```

`vite build` now produces one handler plus the client assets. The same output serves Electron and a
plain Node deployment.

---

## Step 2: run it in the main process

The main bundle is CommonJS. The handler is ESM. A dynamic `import()` bridges them:

```ts
// electron/src/handler.ts
const module = (await import(pathToFileURL(entry).href)) as {
  default: { fetch: FetchHandler }
}
loaded = { fetch: module.default.fetch, root }
```

The main process can now answer requests directly. It also gets a bonus: **server functions run in
the main process**, so they can call Electron APIs.

---

## Step 3: serve the window over `app://`

Electron lets you register a privileged custom scheme and answer it with a fetch handler:

```ts
// electron/src/protocol.ts
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
])

session.defaultSession.protocol.handle('app', (request) =>
  fetch(toServerRequest(request)),
)
```

The window loads `app://renderer/`. Relative asset URLs resolve to the same origin. Fetch, modules,
history, and streaming all work. The handler never touches a socket.

![Production flow: custom scheme or loopback HTTP](blog/prod-flow.png)

---

## The four sharp edges

Custom schemes are not HTTP. Four things broke, and each one taught me something.

### 1. Custom schemes have a null origin

TanStack Start normalizes every request URL with `new URL(...)`. For a custom scheme, `URL.origin` is
the string `"null"`, so this throws:

```
TypeError: Invalid URL
  input: '/api/health'
  base: 'null'
```

The fix is a synthetic origin. The protocol layer rewrites each `app://renderer/...` request into a
normal request for `http://localhost`, and rewrites the `Origin` and `Referer` headers to match.

### 2. CSRF middleware checks the origin

TanStack Start protects server functions with CSRF middleware. It reads `Sec-Fetch-Site` first, then
`Origin`, then `Referer`. After the rewrite, all three agree. Requests from the renderer look
same-origin, and the middleware passes them.

### 3. Chromium blocks cookies on custom schemes

This is the biggest one. The error is explicit:

```
Failed to set cookie - Attempted to set a cookie from a scheme
that does not support cookies.
```

Server sessions would simply break. So the project keeps a small cookie jar for the app origin. It
adds a `Cookie` header to each request and stores each `Set-Cookie` response header. Server sessions
work again.

Two limits remain, and I document them instead of hiding them:

- **`document.cookie` is always empty.** Page JavaScript cannot read or write cookies.
- **The jar lives in memory.** Cookies clear when the app quits.

If you need normal cookie behavior, the project has an escape hatch: start the same handler as a
child process on a loopback port.

```bash
ELECTRON_USE_HTTP_SERVER=1 pnpm start
```

One flag. Same build. One local socket.

### 4. Packaging has no `node_modules`

The main bundle inlines its dependencies. The handler is self-contained. So the package ships:

```
Contents/Resources/
├── app.asar        ~50 KB   (main, preload, package.json)
└── app-server/     ~2.4 MB  (handler, client assets, serve.cjs)
```

No `node_modules`. The installer stays small, and the app starts fast.

---

## Proof: zero listening sockets

Here is the whole point in one command:

![lsof shows no listening TCP sockets](blog/no-ports.png)

The app is running. SSR, server functions, RSC — all working. And nothing listens on TCP.

I did not want to trust that by eye. So the repo has an end-to-end smoke test that drives the real
renderer through `webContents.executeJavaScript`:

![pnpm smoke output with six checks](blog/smoke.png)

Six checks: server-rendered HTML, the IPC bridge, client navigation with a server-function mutation,
RSC rendering, streamed data, and one timing check that fails if streaming is buffered. The last one
matters — a protocol handler can silently buffer, so the test measures the first byte and the full
response time of an SSR page.

---

## The app tour

Streaming works through the custom protocol. The shell arrives first, the report streams in later:

![Streaming SSR page](screenshots/streaming-ssr.jpg)

Server functions call real Node APIs. This counter writes a file to Electron's `userData` directory:

![Server functions page with the filesystem counter](screenshots/server-functions.jpg)

React Server Components render on the server and arrive as a Flight payload. Client islands keep
their state:

![Server components page](screenshots/server-components.jpg)

---

## Development stays normal

None of this applies in development, and that is on purpose. `pnpm dev` keeps the Vite dev server and
full HMR. The `app://` scheme is a production concern.

![Development flow: Vite, tsup watch, and Electron](blog/dev-flow.png)

You get hot reload for routes and components, and an automatic restart when the main process changes.

---

## Choosing between the two modes

Both modes ship in the repo. Pick based on your app:

**Custom scheme (default) — `pnpm start`**

- No open ports, no firewall prompts, no local API.
- In-process handler, so server code can use Electron APIs.
- Cookies work through the jar, but `document.cookie` stays empty.
- One caveat: server code sees `http://localhost` as its origin, so use relative URLs.

**Loopback HTTP — `ELECTRON_USE_HTTP_SERVER=1 pnpm start`**

- Normal cookies, normal origins, a debuggable URL.
- Use it when the scheme limits break something, or when you want to inspect the server in a browser.

---

## What I got

After the migration, the starter looks like this:

- **One handler, two hosts.** Electron serves it in-process. Node serves it with `srvx`. Same code.
- **No listening sockets** in the default production mode.
- **Full framework features** in the desktop build: SSR, streaming, server functions, server routes,
  and experimental RSC.
- **A typed IPC bridge** next to the server functions, with clear rules for when to use which.
- **A six-check smoke test** that runs in CI and catches regressions in the whole stack.

The codebase is small. The interesting parts are three files: `handler.ts` loads the bundle,
`protocol.ts` answers `app://`, and `cookies.ts` keeps sessions alive.

---

## Limitations, honestly

- **RSC is experimental.** The API can change. It is behind a flag in `vite.config.ts`.
- **Nitro is a beta dependency** at this version. Pin it.
- **Custom scheme limits are real.** The README has a full list of what changes and what breaks.
- **Signing and icons** are not included. Bring your own certificate.

---

## Try it

```bash
git clone git@github.com:spa5k/tanstack-start-electron.git
cd tanstack-start-electron
pnpm install
pnpm dev      # desktop app with HMR
pnpm start    # production build, no open ports
pnpm smoke    # six checks against the real app
```

The repository: **https://github.com/spa5k/tanstack-start-electron**

If you want the full details — every trade-off, the packaging layout, and the smoke test — the README
covers them. And if you find a better way to handle cookies on custom schemes, I would love to hear
it.

---

*Built with [TanStack Start](https://tanstack.com/start), [Nitro](https://nitro.build), and
[Electron](https://www.electronjs.org/). The in-process protocol idea comes from
[`next-electron-rsc`](https://github.com/kirill-konshin/next-electron-rsc) by Kirill Konshin.*

<!--
PUBLISHING NOTES (delete before posting)

1. Upload these images to Medium in this order:
   - screenshots/overview.jpg          (near "What the app does")
   - blog/prod-flow.png                (architecture section)
   - blog/no-ports.png                 (proof section)
   - blog/smoke.png                    (proof section)
   - screenshots/streaming-ssr.jpg     (app tour)
   - screenshots/server-functions.jpg  (app tour)
   - screenshots/server-components.jpg (app tour)
   - blog/dev-flow.png                 (development section)
2. Medium strips tables. This post has none — all lists.
3. Code blocks paste best with Medium's "Code block" (Cmd+Opt+6) formatting.
4. Suggested tags: Electron, React, TypeScript, Web Development, JavaScript.
5. Suggested subtitle is the line under the title.
-->
