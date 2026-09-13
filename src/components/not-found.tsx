import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <div className="py-16 text-center">
      <p className="font-mono text-sm text-neutral-400">404</p>
      <h1 className="mt-2 text-lg font-semibold text-neutral-900">
        That route does not exist
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        TanStack Router handled this on the server and on the client.
      </p>
      <Link
        to="/"
        className="mt-5 inline-block border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 hover:bg-neutral-100"
      >
        Back to the overview
      </Link>
    </div>
  )
}
