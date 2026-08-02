import { InputHTMLAttributes } from "react"

// Shared form primitives for every auth flow (signin/signup/forgot/reset).
// Light aesthetic, matching the homepage signup screen — grey inputs, NNAWCA
// brand blue accent.

export const ACCENT = "#009ae4" // matches --color-brand

export const fieldClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm " +
  "text-charcoal-800 placeholder:text-gray-400 outline-none transition " +
  "focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10"

export function Field({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label
        htmlFor={props.id ?? props.name}
        className="mb-1.5 block text-sm font-bold text-charcoal-800"
      >
        {label}
      </label>
      <input {...props} className={fieldClass} />
    </div>
  )
}

export function SubmitButton({ loading, idleLabel }: { loading: boolean; idleLabel: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-xl bg-brand px-4 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-brand-600 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Please wait…" : idleLabel}
    </button>
  )
}

export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
      {children}
    </p>
  )
}

export function FormSuccess({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
      {children}
    </p>
  )
}

// "Homepage \\ <title>" breadcrumb heading — matches the homepage signup card.
export function AuthHeading({ title }: { title: string }) {
  return (
    <p className="text-2xl font-extrabold tracking-tight">
      <a href="/" className="text-brand hover:underline">Homepage</a>
      <span className="text-gray-400"> {"\\\\"} </span>
      <span className="text-charcoal-800">{title}</span>
    </p>
  )
}

// Top-right actions: a ghost link + the blue "Find an Alumni".
export function AuthActions({ ghostLabel, ghostHref }: { ghostLabel: string; ghostHref: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-end gap-3 sm:absolute sm:right-10 sm:top-6 sm:mb-0">
      <a href={ghostHref} className="rounded-lg bg-brand-50 px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-100">
        {ghostLabel}
      </a>
      <a href="/community" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600">
        Find an Alumni
      </a>
    </div>
  )
}

export function AuthFooterNote() {
  return (
    <p className="mt-8 text-center text-sm text-gray-400">
      All Rights Reserved © Handcrafted by the people of{" "}
      <span className="font-semibold text-gray-600">NNAWCA</span>.
    </p>
  )
}
