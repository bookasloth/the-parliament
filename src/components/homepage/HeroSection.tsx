import { SignupCard } from "./SignupCard";
import { NetworkPanel } from "./NetworkPanel";

export function HeroSection() {
  return (
    <div className="flex h-[100dvh] flex-col lg:min-h-[100dvh] lg:flex-row">
      {/* Left — shared network brand panel */}
      <NetworkPanel className="lg:min-h-[100dvh] lg:w-[44%]" />

      {/* Right — form. Fixed 100vh frame on mobile (min-h-0 lets it scroll
          internally instead of pushing the page); natural height on desktop. */}
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-y-auto px-6 py-4 sm:px-10 sm:py-10 lg:h-auto lg:min-h-0 lg:overflow-visible lg:px-16">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-3 sm:mb-10">
          <a href="/auth/signin" className="rounded-[4px] bg-brand-50 px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-100">
            Already Member? Login
          </a>
          <a href="/community" className="rounded-[4px] bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600">
            Find an Alumni
          </a>
        </div>

        <div className="m-auto w-full max-w-xl">
          <SignupCard />
        </div>
      </div>
    </div>
  );
}
