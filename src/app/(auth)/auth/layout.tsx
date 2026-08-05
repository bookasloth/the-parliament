import { NetworkPanel } from "@/components/homepage/NetworkPanel"

// Shared shell for all auth flows: dark network brand panel (desktop) + light
// form column — same split as the homepage.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] flex-col bg-white lg:min-h-[100dvh] lg:flex-row">
      <NetworkPanel className="lg:min-h-[100dvh] lg:w-[44%]" />
      <main className="relative flex h-full min-h-0 flex-1 flex-col overflow-y-auto px-6 py-10 sm:px-10 lg:h-auto lg:min-h-0 lg:overflow-visible lg:px-16">
        {children}
      </main>
    </div>
  )
}
