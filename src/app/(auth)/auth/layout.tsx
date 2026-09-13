import { Users, Globe, Home } from "lucide-react"
import { NetworkPanel } from "@/components/homepage/NetworkPanel"

// Shared shell for all auth flows: light form column (left) + dark network brand
// panel (right, desktop-only — hidden on mobile).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] flex-col bg-white lg:min-h-[100dvh] lg:flex-row">
      <main className="relative flex h-full min-h-0 flex-1 flex-col overflow-y-auto px-6 py-10 sm:px-10 lg:h-auto lg:min-h-0 lg:overflow-visible lg:px-16">
        {children}
      </main>
      <NetworkPanel
        heading={<>Welcome Home<span className="text-brand">.</span></>}
        subhead={
          <>
            Reconnect with classmates, discover alumni across generations, and keep
            the <span className="font-semibold text-brand">Navodaya</span> spirit alive.
          </>
        }
        stats={[
          { value: "500+", label: "Verified Alumni", icon: <Users className="h-5 w-5 text-brand" /> },
          { value: "18", label: "Countries", icon: <Globe className="h-5 w-5 text-[#3ddc84]" /> },
          { value: "10", label: "Houses", icon: <Home className="h-5 w-5 text-[#ff6ba8]" /> },
        ]}
        quote={{
          text: "NNAWCA turned a scattered batch into a living network — the platform where every Navodian finds their way home.",
          name: "Pranav Kadoo",
          role: "Batch 2006–13, Shiwalik House",
        }}
        credit={
          <>
            Made with ❤️ by{" "}
            <a
              href="https://shubhamdatarkar.com/projects/nnawca"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white transition-colors hover:text-[#5cc6ff]"
            >
              Durga and Shubham Datarkar
            </a>
          </>
        }
        className="lg:min-h-[100dvh] lg:w-[44%]"
      />
    </div>
  )
}
