import { SignupCard } from "./SignupCard";
import { NetworkPanel } from "./NetworkPanel";

export function HeroSection() {
  return (
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
      {/* Left — shared network brand panel */}
      <NetworkPanel className="lg:min-h-[100dvh] lg:w-[44%]" />

      {/* Right — form */}
      <div className="relative flex flex-1 flex-col px-6 py-10 sm:px-10 lg:px-16">
        <div className="mb-8 flex flex-wrap items-center justify-end gap-3 sm:absolute sm:right-10 sm:top-6 sm:mb-0">
          <a href="/auth/signin" className="rounded-lg bg-brand-50 px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-100">
            Already Member? Login
          </a>
          <a href="/community" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600">
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
