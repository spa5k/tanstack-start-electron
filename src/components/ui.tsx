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
    <section className={cx('border border-neutral-200 bg-white', className)}>
      {eyebrow ? (
        <p className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-[11px] font-medium tracking-wider text-neutral-500 uppercase">
          {eyebrow}
        </p>
      ) : null}
      {title ? (
        <h2 className="px-4 pt-3 text-sm font-semibold text-neutral-900">
          {title}
        </h2>
      ) : null}
      <div className="px-4 py-3 text-sm leading-relaxed text-neutral-700">
        {children}
      </div>
    </section>
  )
}

const pillTones = {
  neutral: 'border-neutral-300 text-neutral-600',
  ok: 'border-emerald-300 text-emerald-700',
  warn: 'border-amber-300 text-amber-700',
  error: 'border-red-300 text-red-700',
} as const

export function Pill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: keyof typeof pillTones
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase',
        pillTones[tone],
      )}
    >
      {children}
    </span>
  )
}

export function Button({
  children,
  className,
  variant = 'default',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary'
}) {
  return (
    <button
      {...props}
      className={cx(
        'border px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary'
          ? 'border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-700'
          : 'border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-neutral-100 py-1.5 last:border-0">
      <dt className="shrink-0 text-neutral-500">{label}</dt>
      <dd className="text-right font-mono text-xs break-all text-neutral-900">
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
          className="h-3 bg-neutral-200"
          style={{ width: `${90 - index * 15}%` }}
        />
      ))}
    </div>
  )
}
