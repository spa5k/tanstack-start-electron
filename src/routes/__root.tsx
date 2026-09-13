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
  { to: '/ssr', label: 'SSR' },
  { to: '/server-functions', label: 'Server functions' },
  { to: '/server-components', label: 'Server components' },
] as const

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10">
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-900 pb-4">
            <div>
              <p className="text-sm font-semibold tracking-tight">
                TanStack Start × Electron
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                SSR · streaming · server functions · RSC · IPC
              </p>
            </div>
            <DesktopBadge />
          </header>

          <nav className="flex flex-wrap gap-x-6 gap-y-2 border-b border-neutral-200 py-3">
            {navigation.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === '/' }}
                className="text-sm text-neutral-500 hover:text-neutral-900"
                activeProps={{
                  className:
                    'font-medium text-neutral-900 underline underline-offset-4',
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <main className="flex-1 py-8">{children}</main>

          <footer className="border-t border-neutral-200 pt-4 text-xs text-neutral-500">
            Rendered on the server, hydrated in the browser.
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
