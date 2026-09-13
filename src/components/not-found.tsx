import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <div className="py-16 text-center">
      <p className="text-6xl font-black text-white/10">404</p>
      <h1 className="mt-3 text-xl font-semibold text-white">
        That route does not exist
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        TanStack Router handled this on both the server and the client.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400/20"
      >
        Back to the overview
      </Link>
    </div>
  )
}
