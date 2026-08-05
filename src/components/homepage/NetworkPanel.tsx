import Link from "next/link";
import { NetworkArt } from "./NetworkArt";

const FOOTER_LINKS = [
  { label: "About", href: "/about" },
  { label: "Committee", href: "/committee" },
  { label: "Blog", href: "/newsroom" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

// Dark network-art brand panel — the shared left side of the homepage and every
// auth screen. Heading top, ambient graph filling the panel, footer bottom.
export function NetworkPanel({
  heading = "Welcome to the NNAWCA!",
  subhead = "Reconnect, reminisce, and rediscover your Navodaya family.",
  className = "",
}: {
  heading?: string;
  subhead?: string;
  className?: string;
}) {
  return (
    <div className={`relative hidden min-h-[42vh] flex-col overflow-hidden bg-[#0b1020] px-8 py-10 lg:flex lg:px-14 ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,rgba(91,157,255,0.12),transparent_60%)]" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[#5b9dff]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 top-10 h-64 w-64 rounded-full bg-[#ff5a5a]/10 blur-3xl" />

      <NetworkArt />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0b1020] via-[#0b1020]/25 to-[#0b1020]" />

      <Link href="/" className="relative">
        <h1 className="font-heading text-3xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-4xl lg:text-5xl">
          {heading}
        </h1>
        <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-300">{subhead}</p>
      </Link>

      <div className="flex-1" />

      <div className="relative border-t border-white/10 pt-5">
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          {FOOTER_LINKS.map((l) => (
            <a key={l.label} href={l.href} className="text-sm font-medium text-slate-300 transition-colors hover:text-white">
              {l.label}
            </a>
          ))}
        </nav>
        <p className="mt-3 text-xs text-slate-400">
          Powered by <span className="font-semibold text-slate-200">Shubham Datarkar</span>
        </p>
      </div>
    </div>
  );
}
