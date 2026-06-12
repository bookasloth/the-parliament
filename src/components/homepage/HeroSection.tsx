import { NetworkVisualization } from "./NetworkVisualization";
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
    metrics: [
      { label: "Alumni", value: "500+" },
      { label: "Cities", value: "50+" },
      { label: "Careers", value: "100+" },
      { label: "Businesses", value: "20+" },
    ],
    primaryCta: "Join Community",
    secondaryCta: "Explore Network",
  },
}: HeroSectionProps) {
  return (
    <section className="relative min-h-screen pt-[72px] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-navy-50/50 via-transparent to-transparent pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6 pt-12 pb-20 lg:pt-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div className="space-y-8">
            <div className="space-y-5">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight text-navy-500 leading-[1.1] text-balance">
                {content.title}
              </h1>
              <p className="text-base sm:text-lg text-charcoal-400 leading-relaxed max-w-lg">
                {content.subtitle}
              </p>
            </div>

            <div className="flex flex-wrap gap-6">
              {content.metrics.map((metric) => (
                <div key={metric.label} className="text-center">
                  <p className="text-2xl sm:text-3xl font-extrabold text-navy-500">
                    {metric.value}
                  </p>
                  <p className="text-xs sm:text-sm text-charcoal-400 font-medium mt-0.5">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/auth/signup"
                className="rounded-full bg-navy-500 px-7 py-3 text-sm font-semibold text-white hover:bg-navy-600 transition-all shadow-md hover:shadow-xl"
              >
                {content.primaryCta}
              </a>
              <a
                href="#"
                className="rounded-full border border-charcoal-200 bg-white px-7 py-3 text-sm font-semibold text-charcoal-600 hover:bg-charcoal-50 transition-all shadow-sm"
              >
                {content.secondaryCta}
              </a>
            </div>

            <div className="max-w-xs">
              <NetworkVisualization />
            </div>
          </div>

          <div className="lg:sticky lg:top-[100px]">
            <SignupCard />
          </div>
        </div>
      </div>
    </section>
  );
}
