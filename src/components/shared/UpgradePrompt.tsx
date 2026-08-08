import Link from "next/link"
import { Lock, ArrowUpRight } from "lucide-react"
import { nextUpgradeTier, PLANS, type PlanCode } from "@/config/membership"

/**
 * Shown in place of a gated feature. Always points the member at the NEXT tier
 * up from where they are — Student → Associate → Premium → Life — per the
 * upgrade ladder. Renders nothing for Life/Committee (nothing left to upgrade).
 *
 * Usage: gate a feature entry point with a benefit check, and when it fails
 * render <UpgradePrompt currentPlan={ctx.planCode} feature="Post a job" />.
 */
export function UpgradePrompt({
  currentPlan,
  feature,
  compact = false,
}: {
  currentPlan: PlanCode
  feature: string
  compact?: boolean
}) {
  const next = nextUpgradeTier(currentPlan)
  if (!next) return null
  const nextName = PLANS[next].displayName

  if (compact) {
    return (
      <Link
        href="/membership"
        className="inline-flex items-center gap-1 rounded-[3px] bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand-100"
      >
        <Lock className="h-3 w-3" /> Upgrade to {nextName}
      </Link>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-[5px] border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-brand-50 text-brand">
        <Lock className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800">{feature} is a {nextName} feature</p>
        <p className="mt-0.5 text-xs text-gray-500">Upgrade your membership to unlock it.</p>
      </div>
      <Link
        href="/membership"
        className="inline-flex items-center gap-1.5 rounded-[4px] bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600"
      >
        Upgrade to {nextName} <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
