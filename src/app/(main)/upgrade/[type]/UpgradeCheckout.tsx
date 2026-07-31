"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowLeftRight, Crown, Tag, Check } from "lucide-react"
import {
  PLANS,
  computePricing,
  lookupPromo,
  PLATFORM_FEE_INR,
  DEV_SUPPORT_DONATION_INR,
  type PlanCode,
} from "@/config/membership"
import { MEMBERSHIP_TIERS, type MembershipTier } from "@/config/membership-colors"

type Target = "associate" | "premium" | "life"

interface Profile {
  name: string
  username: string | null
  photoUrl: string | null
  coverUrl: string | null
  headline: string | null
  houseName: string | null
  houseColor: string | null
  batchLabel: string | null
}

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`

export default function UpgradeCheckout({
  target,
  profile,
  currentPlan,
}: {
  target: Target
  profile: Profile
  currentPlan: PlanCode
}) {
  const router = useRouter()
  const plan = PLANS[target]
  const meta = MEMBERSHIP_TIERS[target as MembershipTier]
  const isYearly = plan.isSubscription

  const [platformFee, setPlatformFee] = useState(true)
  const [donate, setDonate] = useState(false)
  const [promoInput, setPromoInput] = useState("")
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [acknowledged, setAcknowledged] = useState(false)

  const pricing = useMemo(
    () => computePricing(target, { platformFee, donate, promoCode: appliedPromo }),
    [target, platformFee, donate, appliedPromo],
  )

  function applyPromo() {
    const found = lookupPromo(promoInput)
    if (!found) {
      setPromoError("Invalid or expired code")
      setAppliedPromo(null)
      return
    }
    setPromoError(null)
    setAppliedPromo(found.code)
    setPromoInput(found.code)
  }

  function subscribe() {
    const q = new URLSearchParams({ plan: target, platformFee: platformFee ? "1" : "0", donate: donate ? "1" : "0" })
    if (appliedPromo) q.set("promo", appliedPromo)
    router.push(`/membership/checkout?${q.toString()}`)
  }

  return (
    <div className="min-h-screen bg-[#eef0f2]">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ─── LEFT: profile card ─── */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div
                className="h-20 bg-gray-200 bg-cover bg-center"
                style={profile.coverUrl ? { backgroundImage: `url(${profile.coverUrl})` } : undefined}
              />
              <div className="px-5 pb-5 -mt-9 text-center">
                <div className="relative mx-auto h-16 w-16 rounded-full border-4 border-white bg-gray-100 overflow-hidden">
                  {profile.photoUrl ? (
                    <Image src={profile.photoUrl} alt={profile.name} className="h-full w-full object-cover" fill sizes="(max-width: 768px) 100vw, 400px" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-bold text-gray-400">
                      {profile.name.charAt(0)}
                    </div>
                  )}
                </div>
                <h2 className="mt-2 text-base font-bold text-gray-900">{profile.name}</h2>
                {profile.headline && <p className="text-xs text-gray-500 mt-0.5">{profile.headline}</p>}

                <div className="mt-4 flex items-stretch justify-center divide-x divide-gray-200 border-t border-gray-100 pt-4">
                  <div className="px-4">
                    <p className="text-sm font-bold text-gray-900">{profile.batchLabel ?? "—"}</p>
                    <p className="text-[11px] text-gray-500">Batch</p>
                  </div>
                  <div className="px-4">
                    <p className="text-sm font-bold" style={profile.houseColor ? { color: profile.houseColor } : undefined}>
                      {profile.houseName ?? "—"}
                    </p>
                    <p className="text-[11px] text-gray-500">House</p>
                  </div>
                </div>
              </div>
              <Link
                href="/profile/edit"
                className="block border-t border-gray-100 py-3 text-center text-sm font-semibold text-brand hover:bg-brand-50 transition-colors"
              >
                Edit Profile
              </Link>
            </div>

            <div className="text-center text-xs text-gray-400 space-y-2">
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                <Link href="/membership" className="hover:text-gray-600">About NNAWCA</Link>
                <Link href="/settings" className="hover:text-gray-600">Settings</Link>
                <Link href="/membership" className="hover:text-gray-600">Help</Link>
                <Link href="/membership" className="hover:text-gray-600">Privacy Policy</Link>
                <Link href="/membership" className="hover:text-gray-600">Terms &amp; Conditions</Link>
              </div>
              <p>© {new Date().getFullYear()} NNAWCA · for JNV Nagpur Alumni</p>
            </div>
          </aside>

          {/* ─── MIDDLE: plan card ─── */}
          <section className="lg:col-span-4">
            <div
              className="rounded-2xl p-6 text-white shadow-lg"
              style={{ background: meta.background }}
            >
              <div className="rounded-xl bg-white py-3 text-center">
                <span className="text-lg font-extrabold" style={{ color: "#0c1d3d" }}>
                  {plan.displayName}
                </span>
              </div>

              <p className="mt-4 text-center text-3xl font-black">
                {rupees(plan.pricePaise)}
                <span className="text-lg font-semibold">{isYearly ? " / Year" : " once"}</span>
              </p>

              {target !== "life" ? (
                <Link
                  href="/upgrade/life"
                  className="mt-4 block rounded-xl bg-amber-100 px-4 py-3 text-center text-sm font-semibold text-amber-900 hover:bg-amber-200 transition-colors"
                >
                  <Crown className="inline h-4 w-4 mr-1 text-amber-700" />
                  Get Life Membership today and never pay again! 🎉
                </Link>
              ) : (
                <div className="mt-4 rounded-xl bg-amber-100 px-4 py-3 text-center text-sm font-semibold text-amber-900">
                  🎉 The last membership you&rsquo;ll ever buy.
                </div>
              )}

              <p className="mt-4 text-center text-sm">
                Read all the{" "}
                <Link href="/membership" className="font-semibold underline decoration-amber-300 underline-offset-2">
                  benefits and perks
                </Link>{" "}
                of buying {plan.displayName}
              </p>

              <Link
                href="/membership"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#2b2b2b] py-3 text-sm font-bold text-white hover:bg-black transition-colors"
              >
                <ArrowLeftRight className="h-4 w-4" /> Change Membership
              </Link>
            </div>
          </section>

          {/* ─── RIGHT: price breakdown ─── */}
          <section className="lg:col-span-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-7">
              {/* Plan price */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-500">Plan Price</span>
                <span className="text-sm font-bold text-gray-500">{rupees(pricing.basePaise)}</span>
              </div>

              {/* Platform fee — optional (opt-out) */}
              <div className="mt-4 flex items-start justify-between gap-3">
                <label className="flex items-center gap-2.5 text-sm text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={platformFee}
                    onChange={(e) => setPlatformFee(e.target.checked)}
                    className="h-4 w-4 rounded accent-brand"
                  />
                  Platform Fee
                </label>
                <span className="text-sm font-medium text-gray-600">₹{PLATFORM_FEE_INR}</span>
              </div>

              {/* Optional dev-support donation */}
              <div className="mt-4 flex items-start justify-between gap-3">
                <label className="flex items-start gap-2.5 text-sm text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={donate}
                    onChange={(e) => setDonate(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-brand"
                  />
                  <span>
                    Support Development Team
                    <span className="block text-xs text-gray-500 mt-0.5">
                      Helps us maintain servers and build better features for alumni.
                    </span>
                    <Link href="/membership" className="block text-xs text-brand mt-0.5 hover:underline">
                      Check What&rsquo;s Coming in Next Weeks
                    </Link>
                  </span>
                </label>
                <span className="text-sm font-medium text-gray-600">₹{DEV_SUPPORT_DONATION_INR}</span>
              </div>

              <hr className="my-5 border-gray-100" />

              {/* Promo code */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    value={promoInput}
                    onChange={(e) => { setPromoInput(e.target.value); setPromoError(null) }}
                    placeholder="Enter Promo Code"
                    className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand uppercase placeholder:normal-case placeholder:text-gray-400"
                  />
                </div>
                <button
                  onClick={applyPromo}
                  className="rounded-lg bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
                >
                  Apply
                </button>
              </div>
              {promoError && <p className="mt-1.5 text-xs text-red-600">{promoError}</p>}
              {pricing.promo && (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                    <Check className="h-3.5 w-3.5" /> {pricing.promo.code} · {pricing.promo.label}
                  </span>
                  <span className="font-semibold text-emerald-700">− {rupees(pricing.discountPaise)}</span>
                </div>
              )}

              <hr className="my-5 border-gray-100" />

              {/* Amount payable */}
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-gray-500">Amount Payable</span>
                <span className="text-xl font-black text-gray-900">
                  {`₹${(pricing.totalPaise / 100).toFixed(2)}`}
                </span>
              </div>

              {/* Non-refundable acknowledgement (financial disclosure) */}
              <label className="mt-5 flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-brand"
                />
                <span className="text-xs text-gray-600 leading-relaxed">
                  I understand this is a <strong>non-refundable</strong> contribution to NNAWCA and have read the membership terms.
                </span>
              </label>

              {/* Subscribe — rainbow border like the reference */}
              <button
                onClick={subscribe}
                disabled={!acknowledged}
                className={`group mt-4 w-full rounded-xl p-[2px] transition-opacity ${acknowledged ? "" : "opacity-40 cursor-not-allowed"}`}
                style={{ background: "linear-gradient(90deg,#ff5f6d,#ffc371,#2ecc71,#00c6ff,#8e44ad,#ff5f6d)" }}
              >
                <span className="flex items-center justify-center rounded-[10px] bg-white py-3 text-sm font-bold text-gray-900 group-hover:bg-transparent group-hover:text-white transition-colors">
                  Subscribe to NNAWCA
                </span>
              </button>
              <p className="mt-3 text-center text-[11px] text-gray-400">
                Secured by Razorpay · You&rsquo;re currently on the <strong className="capitalize">{currentPlan}</strong> plan
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
