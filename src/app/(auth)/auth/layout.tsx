import Link from "next/link"

// Shared shell for all auth flows: dark branded panel (desktop) + dark card.
// Aesthetic inspired by shubhamdatarkar.com — #0a0a0a surfaces, orange accent.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white">
      {/* Brand panel — hidden on small screens */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-white/10 p-12 lg:flex">
        {/* soft orange glow */}
        <div
          className="pointer-events-none absolute -left-24 top-1/3 h-96 w-96 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(closest-side, #ff4800, transparent)" }}
        />
        <Link href="/" className="relative font-heading text-xl font-bold tracking-tight">
          NNAWCA
        </Link>
        <div className="relative">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[#ff4800]">
            JNV Nagpur Alumni Network
          </p>
          <h2 className="font-heading text-4xl font-bold leading-tight">
            The <span className="text-[#ff4800]">Parliament</span>
          </h2>
          <p className="mt-4 max-w-sm text-neutral-400">
            Reconnect with your batch, grow with the network, and give back to
            Jawahar Navodaya Vidyalaya, Nagpur.
          </p>
        </div>
        <p className="relative text-xs text-neutral-600">
          © {new Date().getFullYear()} Nagpur Navodaya Alumni Welfare &amp; Charitable Association
        </p>
      </aside>

      {/* Form column */}
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          {/* mobile-only wordmark */}
          <p className="mb-6 text-center font-heading text-lg font-bold lg:hidden">
            NNAWCA
          </p>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
