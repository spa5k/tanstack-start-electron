/// <reference types="vite/client" />
import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import type { ReactNode } from 'react'
import { DesktopBadge } from '~/components/desktop-badge'
import appCss from '~/styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'TanStack Start × Electron' },
      {
        name: 'description',
        content:
          'SSR, streaming and React Server Components running inside an Electron desktop shell.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
      { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/site.webmanifest' },
    ],
  }),
  // `shellComponent` renders the actual <html> document. Start streams the
  // matched route into `children`, so the root does not need an <Outlet />.
  shellComponent: RootDocument,
})

const navigation = [
  { to: '/', label: 'Overview' },
  { to: '/ssr', label: 'Streaming SSR' },
  { to: '/server-functions', label: 'Server Functions' },
  { to: '/server-components', label: 'Server Components' },
] as const

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_50%_at_50%_-10%,rgba(34,211,238,0.14),transparent)]" />
        <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 text-sm font-black text-slate-950">
                TS
              </span>
              <div>
                <p className="text-sm font-semibold tracking-wide">
                  TanStack Start × Electron
                </p>
                <p className="text-xs text-slate-400">
                  SSR · streaming · server functions · RSC · IPC
                </p>
              </div>
            </div>
            <DesktopBadge />
          </header>

          <nav className="flex flex-wrap gap-1 py-4">
            {navigation.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === '/' }}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                activeProps={{
                  className: 'bg-white/10 text-white shadow-inner',
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <main className="flex-1 pb-12">{children}</main>

          <footer className="border-t border-white/10 pt-4 text-xs text-slate-500">
            Rendering is server-driven; interactivity is client-driven. Read
            README.md for the full architecture guide.
          </footer>
        </div>

        {import.meta.env.DEV ? (
          <TanStackRouterDevtools position="bottom-right" />
        ) : null}
        <Scripts />
      </body>
    </html>
  )
}
