import { InputHTMLAttributes } from "react"

// Shared form primitives for every auth flow (signin/signup/forgot/reset).
// Dark aesthetic — inspired by shubhamdatarkar.com: near-black surfaces,
// orange (#ff4800) accent, Poppins. Kept local to the auth group; does not
// touch the app-wide brand tokens.

export const ACCENT = "#ff4800"

export const fieldClass =
  "mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm " +
  "text-white placeholder:text-neutral-500 outline-none transition " +
  "focus:border-[#ff4800] focus:ring-2 focus:ring-[#ff4800]/25"

export function Field({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label
        htmlFor={props.id ?? props.name}
        className="text-xs font-medium uppercase tracking-wide text-neutral-400"
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
      className="w-full rounded-lg bg-[#ff4800] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ff5f1f] focus:outline-none focus:ring-2 focus:ring-[#ff4800]/40 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Please wait…" : idleLabel}
    </button>
  )
}

export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
      {children}
    </p>
  )
}

export function FormSuccess({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300">
      {children}
    </p>
  )
}
