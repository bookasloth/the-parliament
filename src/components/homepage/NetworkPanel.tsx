import Link from "next/link";
import { LogoMark } from "@/components/shared/Logo";

const FOOTER_LINKS = [
  { label: "About", href: "/about" },
  { label: "Committee", href: "/committee" },
  { label: "Blog", href: "/newsroom" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

// Dark network-art brand panel — the shared brand side of the homepage and every
// auth screen. Heading top, optional stat cards, ambient graph filling the
// panel, footer bottom.
export function NetworkPanel({
  heading = "Welcome to the NNAWCA!",
  subhead = "Reconnect, reminisce, and rediscover your Navodaya family.",
  stats,
  quote,
  credit = (
    <>Powered by <span className="font-semibold text-slate-200">Shubham Datarkar</span></>
  ),
  className = "",
}: {
  heading?: React.ReactNode;
  subhead?: React.ReactNode;
  stats?: { value: string; label: string; icon?: React.ReactNode }[];
  quote?: { text: React.ReactNode; name: string; nameHref?: string; role: string; avatar?: string };
  credit?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative hidden min-h-[42vh] flex-col overflow-hidden bg-[#080c1a] px-8 py-10 lg:flex lg:px-14 ${className}`}>
      {/* Ambient aurora — drifting blurred house-colour orbs, no dot-network. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(130%_100%_at_82%_2%,rgba(0,154,228,0.22),transparent_52%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_12%_98%,rgba(45,111,224,0.22),transparent_55%)]" />
        <div className="absolute -right-24 -top-28 h-[26rem] w-[26rem] rounded-full bg-[#009ae4]/20 blur-[90px] [animation:aurora-drift_22s_ease-in-out_infinite]" />
        <div className="absolute -left-28 top-1/4 h-80 w-80 rounded-full bg-[#2d6fe0]/20 blur-[80px] [animation:aurora-drift_28s_ease-in-out_infinite_reverse]" />
        <div className="absolute bottom-4 right-1/4 h-72 w-72 rounded-full bg-[#3ddc84]/12 blur-[80px] [animation:aurora-drift_25s_ease-in-out_infinite]" style={{ animationDelay: "-6s" }} />
        <div className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-[#e0573e]/12 blur-[90px] [animation:aurora-drift_30s_ease-in-out_infinite_reverse]" style={{ animationDelay: "-10s" }} />
        <div className="absolute right-1/3 top-1/3 h-56 w-56 rounded-full bg-[#ffd23f]/10 blur-[70px] [animation:aurora-drift_26s_ease-in-out_infinite]" style={{ animationDelay: "-14s" }} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#080c1a]/70 via-transparent to-[#080c1a]" />

      <Link href="/" className="relative">
        <span className="mb-6 inline-flex items-center gap-2.5">
          <LogoMark mono className="h-9 w-9 text-white" />
          <span className="text-lg font-bold tracking-tight text-white">NNAWCA</span>
        </span>
        <h1 className="font-heading text-3xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-4xl lg:text-5xl">
          {heading}
        </h1>
        <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-300">{subhead}</p>
      </Link>

      {stats && stats.length > 0 && (
        <div className="relative mt-8 flex flex-wrap gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="min-w-[104px] rounded-[5px] border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2">
                {s.icon}
                <span className="font-heading text-2xl font-extrabold leading-none text-white">{s.value}</span>
              </div>
              <div className="mt-2 text-xs font-medium text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1" />

      {quote && (
        <figure className="relative mt-8">
          <span className="font-heading text-4xl font-extrabold leading-none text-brand">&ldquo;</span>
          <blockquote className="mt-1 max-w-md font-heading text-lg font-semibold leading-snug tracking-tight text-slate-100 sm:text-xl">
            {quote.text}
          </blockquote>
          <figcaption className="mt-4 flex items-center gap-3.5">
            {quote.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={quote.avatar}
                alt={quote.name}
                width={46}
                height={46}
                className="h-[46px] w-[46px] flex-none rounded-full border-2 border-[#5cc6ff]/50 object-cover"
              />
            ) : (
              <div
                aria-hidden
                className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-full border-2 border-[#5cc6ff]/50 bg-gradient-to-br from-brand to-[#5cc6ff] font-heading text-sm font-extrabold text-[#04121f]"
              >
                {quote.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </div>
            )}
            <div>
              <div className="font-heading text-sm font-bold text-white">
                {quote.nameHref ? (
                  <a
                    href={quote.nameHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-b border-transparent transition-colors hover:border-[#5cc6ff] hover:text-[#5cc6ff]"
                  >
                    {quote.name}
                  </a>
                ) : (
                  quote.name
                )}
              </div>
              <div className="mt-0.5 text-xs text-slate-400">{quote.role}</div>
            </div>
          </figcaption>
        </figure>
      )}

      <div className="relative mt-8 border-t border-white/10 pt-5">
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          {FOOTER_LINKS.map((l) => (
            <a key={l.label} href={l.href} className="text-sm font-medium text-slate-300 transition-colors hover:text-white">
              {l.label}
            </a>
          ))}
        </nav>
        <p className="mt-3 text-xs text-slate-400">{credit}</p>
      </div>
    </div>
  );
}
