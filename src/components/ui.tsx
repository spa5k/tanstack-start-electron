import type { ReactNode } from 'react'

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function Card({
  title,
  eyebrow,
  children,
  className,
}: {
  title?: ReactNode
  eyebrow?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cx(
        'rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-xl shadow-black/20 backdrop-blur',
        className,
      )}
    >
      {eyebrow ? (
        <p className="text-[11px] font-semibold tracking-[0.18em] text-cyan-300/80 uppercase">
          {eyebrow}
        </p>
      ) : null}
      {title ? (
        <h2 className="mt-1 text-lg font-semibold text-white">{title}</h2>
      ) : null}
      <div className="mt-3 text-sm leading-relaxed text-slate-300">
        {children}
      </div>
    </section>
  )
}

export function Pill({
  children,
  tone = 'slate',
}: {
  children: ReactNode
  tone?: 'slate' | 'cyan' | 'emerald' | 'amber' | 'violet'
}) {
  const tones: Record<string, string> = {
    slate: 'border-white/10 bg-white/5 text-slate-300',
    cyan: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
    emerald: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    amber: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
    violet: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
  }

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

export function Button({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cx(
        'rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 py-1.5 last:border-0">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-mono text-[12px] break-all text-slate-200">
        {value}
      </dd>
    </div>
  )
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-3 rounded-full bg-white/10"
          style={{ width: `${90 - index * 15}%` }}
        />
      ))}
    </div>
  )
}
