interface FinalCTAProps {
  title?: string;
  primaryCta?: string;
  secondaryCta?: string;
}

export function FinalCTA({
  title = "The Next Chapter of JNV Starts Here.",
  primaryCta = "Create Account",
  secondaryCta = "Continue with Google",
}: FinalCTAProps) {
  return (
    <section className="relative py-24 lg:py-36 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand via-brand-600 to-brand-800" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.08)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(212,168,0,0.06)_0%,transparent_60%)]" />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold text-white leading-[1.1] text-balance">
          {title}
        </h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="/auth/signup"
            className="rounded bg-white px-8 py-3.5 text-sm font-bold text-brand hover:bg-gold-50 transition-all shadow-lg hover:shadow-xl"
          >
            {primaryCta}
          </a>
          <a
            href="#"
            className="rounded border border-white/20 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/20 transition-all backdrop-blur-sm"
          >
            {secondaryCta}
          </a>
        </div>
      </div>
    </section>
  );
}
