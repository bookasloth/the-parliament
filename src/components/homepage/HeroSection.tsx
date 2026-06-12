import { SignupCard } from "./SignupCard";
import type { HeroContent } from "@/lib/homepage-data";

interface HeroSectionProps {
  content?: HeroContent;
}

export function HeroSection({
  content = {
    title: "Your JNV Journey Didn't End at Graduation.",
    subtitle:
      "Reconnect with alumni, discover opportunities, grow your network, support businesses, and shape the future of the community.",
    metrics: [],
    primaryCta: "Join Community",
    secondaryCta: "Explore Network",
  },
}: HeroSectionProps) {
  return (
    <section className="relative min-h-screen pt-[72px] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-50/50 via-transparent to-transparent pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6 pt-12 pb-20 lg:pt-20">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
          <div className="flex-1 space-y-8">
            <div className="space-y-5">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight text-brand leading-[1.1] text-balance">
                {content.title}
              </h1>
              <p className="text-base sm:text-lg text-charcoal-400 leading-relaxed max-w-lg">
                {content.subtitle}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/auth/signup"
                className="rounded bg-brand px-7 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-all shadow-md hover:shadow-xl"
              >
                {content.primaryCta}
              </a>
              <a
                href="#"
                className="rounded border border-charcoal-200 bg-white px-7 py-3 text-sm font-semibold text-charcoal-600 hover:bg-charcoal-50 transition-all shadow-sm"
              >
                {content.secondaryCta}
              </a>
            </div>
          </div>

          <div className="lg:w-[90%] lg:max-w-md lg:sticky lg:top-[100px]">
            <SignupCard />
          </div>
        </div>
      </div>
    </section>
  );
}
