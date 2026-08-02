import { NetworkPanel } from "@/components/homepage/NetworkPanel"

// Shared shell for all auth flows: dark network brand panel (desktop) + light
// form column — same split as the homepage.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-white lg:flex-row">
      <NetworkPanel className="lg:min-h-[100dvh] lg:w-[44%]" />
      <main className="relative flex flex-1 flex-col px-6 py-10 sm:px-10 lg:px-16">
        {children}
      </main>
    </div>
  )
}
