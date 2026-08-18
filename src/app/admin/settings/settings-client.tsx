"use client"

import { useState } from "react"
import {
  FloppyDisk, Globe, UserPlus, ToggleLeft,
  Envelope, CreditCard, Warning, Eye, EyeSlash, GraduationCap,
  Database, Trash, Power, Key, ArrowsClockwise,
} from "@phosphor-icons/react"
import { PageHeader, useRowAction } from "../admin-ui"
import { saveSettingsAction } from "./actions"

// Persisted section shapes + defaults (used when the store has no blob yet).
type General = { siteName: string; orgName: string; supportEmail: string }
type Access = { openRegistration: boolean; requireVerification: boolean; guardianConsent: boolean; onboardingGate: boolean }
type Features = {
  feed: boolean; messaging: boolean; groups: boolean; events: boolean; membership: boolean
  businessDirectory: boolean; jobBoard: boolean; games: boolean
}
type Maintenance = { maintenanceMode: boolean }

const DEFAULTS = {
  general: {
    siteName: "NNAWCA",
    orgName: "Nagpur Navodaya Alumni Welfare and Charitable Association (NNAWCA)",
    supportEmail: "support@nnawca.org",
  } satisfies General,
  access: {
    openRegistration: true,
    requireVerification: true,
    guardianConsent: true,
    onboardingGate: true,
  } satisfies Access,
  features: {
    feed: true, messaging: true, groups: true, events: true, membership: true,
    businessDirectory: false, jobBoard: false, games: false,
  } satisfies Features,
  maintenance: { maintenanceMode: false } satisfies Maintenance,
}

// School is a fixed display for now (multi-school future), not a persisted control.
const ACTIVE_SCHOOL = "JNV Nagpur (NGP)"

function pick<T extends object>(initial: Record<string, unknown>, key: string, fallback: T): T {
  const stored = initial[key]
  return stored && typeof stored === "object" ? { ...fallback, ...(stored as Partial<T>) } : fallback
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className={`relative h-6 w-11 rounded-full transition-colors flex-shrink-0 ${on ? "bg-blue-600" : "bg-gray-200"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-[3px] bg-white shadow transition-transform ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  )
}

function SettingRow({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800">{label}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">{desc}</p>
      </div>
      {children}
    </div>
  )
}

function SaveButton({ pending, onClick }: { pending: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={pending}
      className="flex items-center gap-1.5 rounded-[3px] bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60">
      <FloppyDisk className="h-3.5 w-3.5" weight="duotone" /> {pending ? "Saving…" : "Save"}
    </button>
  )
}

const SectionHead = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 border-b border-gray-200">
    {icon}
    <h2 className="text-sm font-bold text-gray-900">{title}</h2>
  </div>
)

type TabKey = "general" | "access" | "features" | "integrations" | "danger"

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "general", label: "General", icon: <Globe className="h-4 w-4" weight="duotone" /> },
  { key: "access", label: "Registration & Access", icon: <UserPlus className="h-4 w-4" weight="duotone" /> },
  { key: "features", label: "Feature Modules", icon: <ToggleLeft className="h-4 w-4" weight="duotone" /> },
  { key: "integrations", label: "Integrations", icon: <Key className="h-4 w-4" weight="duotone" /> },
  { key: "danger", label: "Danger Zone", icon: <Warning className="h-4 w-4" weight="duotone" /> },
]

export function SettingsClient({ initial }: { initial: Record<string, unknown> }) {
  const { run, isBusy } = useRowAction()

  const [general, setGeneral] = useState<General>(() => pick(initial, "general", DEFAULTS.general))
  const [access, setAccess] = useState<Access>(() => pick(initial, "access", DEFAULTS.access))
  const [features, setFeatures] = useState<Features>(() => pick(initial, "features", DEFAULTS.features))
  const [maintenance, setMaintenance] = useState<Maintenance>(() => pick(initial, "maintenance", DEFAULTS.maintenance))
  const [showRazorpayKey, setShowRazorpayKey] = useState(false)
  const [tab, setTab] = useState<TabKey>("general")

  function save(key: string, values: unknown) {
    run(key, {
      action: () => saveSettingsAction(key, values),
      success: "Settings saved",
      error: "Couldn't save settings",
    })
  }

  return (
    <div className="max-w-5xl">
      <PageHeader title="Platform Settings" description="Global configuration for NNAWCA" />

      <div className="flex flex-col md:flex-row gap-5">
        {/* Tab rail */}
        <nav className="flex md:flex-col gap-1 md:w-56 flex-shrink-0 overflow-x-auto md:overflow-visible">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-[4px] px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                tab === t.key
                  ? t.key === "danger"
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-gray-600 hover:bg-gray-100 border border-transparent"
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </nav>

        {/* Active pane */}
        <div className="flex-1 min-w-0 space-y-4">

        {/* General */}
        {tab === "general" && (
        <section className="rounded-[5px] border border-gray-200 bg-white overflow-hidden">
          <SectionHead icon={<Globe className="h-4 w-4 text-blue-600" weight="duotone" />} title="General" />
          <div className="p-4 sm:p-5 space-y-4">
            {([
              { key: "siteName", label: "Platform Name" },
              { key: "orgName", label: "Legal Organization Name" },
              { key: "supportEmail", label: "Support Email" },
            ] as const).map(f => (
              <div key={f.key}>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">{f.label}</label>
                <input
                  value={general[f.key]}
                  onChange={e => setGeneral(g => ({ ...g, [f.key]: e.target.value }))}
                  className="w-full rounded-[3px] border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800 outline-none focus:border-blue-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">Active School</label>
              <div className="flex items-center gap-2 rounded-[3px] border border-gray-200 bg-gray-100 px-3 py-2">
                <GraduationCap className="h-3.5 w-3.5 text-gray-500" weight="duotone" />
                <span className="text-xs text-gray-600">{ACTIVE_SCHOOL}</span>
                <span className="ml-auto rounded-[3px] bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">Multi-school ready</span>
              </div>
            </div>
            <div className="flex justify-end">
              <SaveButton pending={isBusy("general")} onClick={() => save("general", general)} />
            </div>
          </div>
        </section>
        )}

        {/* Registration & access */}
        {tab === "access" && (
        <section className="rounded-[5px] border border-gray-200 bg-white overflow-hidden">
          <SectionHead icon={<UserPlus className="h-4 w-4 text-emerald-600" weight="duotone" />} title="Registration & Access" />
          <div className="px-4 sm:px-5 divide-y divide-gray-200">
            {([
              { key: "openRegistration", label: "Open registration", desc: "Anyone can sign up; off means invite-only" },
              { key: "requireVerification", label: "Require verification for posting", desc: "Unverified users can browse but not post" },
              { key: "guardianConsent", label: "Guardian consent for minors", desc: "Required by policy for users under 18" },
              { key: "onboardingGate", label: "Onboarding gate", desc: "Force new users through the onboarding wizard" },
            ] as const).map(f => (
              <SettingRow key={f.key} label={f.label} desc={f.desc}>
                <Toggle on={access[f.key]} onChange={() => setAccess(a => ({ ...a, [f.key]: !a[f.key] }))} />
              </SettingRow>
            ))}
          </div>
          <div className="flex justify-end px-4 sm:px-5 py-3.5 border-t border-gray-200">
            <SaveButton pending={isBusy("access")} onClick={() => save("access", access)} />
          </div>
        </section>
        )}

        {/* Feature flags */}
        {tab === "features" && (
        <section className="rounded-[5px] border border-gray-200 bg-white overflow-hidden">
          <SectionHead icon={<ToggleLeft className="h-4 w-4 text-violet-600" weight="duotone" />} title="Feature Modules" />
          <div className="px-4 sm:px-5 divide-y divide-gray-200">
            {([
              { key: "feed", label: "Feed", desc: "Posts, polls, reactions, comments" },
              { key: "messaging", label: "Messaging", desc: "Direct messages and conversations" },
              { key: "groups", label: "Groups", desc: "Community groups and discussions" },
              { key: "events", label: "Events", desc: "Event listings, RSVPs, ticketing" },
              { key: "membership", label: "Paid Membership", desc: "Associate, Premium, and Life plans" },
              { key: "businessDirectory", label: "Business Directory", desc: "Alumni business listings and reviews (planned)" },
              { key: "jobBoard", label: "Job Board", desc: "Job postings and applications (planned)" },
              { key: "games", label: "Games & Tournaments", desc: "Casual games with zero-karma policy (planned)" },
            ] as const).map(f => (
              <SettingRow key={f.key} label={f.label} desc={f.desc}>
                <Toggle on={features[f.key]} onChange={() => setFeatures(x => ({ ...x, [f.key]: !x[f.key] }))} />
              </SettingRow>
            ))}
          </div>
          <div className="flex justify-end px-4 sm:px-5 py-3.5 border-t border-gray-200">
            <SaveButton pending={isBusy("features")} onClick={() => save("features", features)} />
          </div>
        </section>
        )}

        {/* Integrations — read-only status/secret display, not persisted here.
            Secret fields (Razorpay key) are write-only: the stored secret lives in
            env, never rendered back. Rotate/test are managed elsewhere. */}
        {tab === "integrations" && (
        <section className="rounded-[5px] border border-gray-200 bg-white overflow-hidden">
          <SectionHead icon={<Key className="h-4 w-4 text-amber-600" weight="duotone" />} title="Integrations" />
          <div className="p-4 sm:p-5 space-y-4">
            <div className="rounded-[4px] border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-gray-500" weight="duotone" />
                <p className="text-xs font-bold text-gray-800">Razorpay</p>
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Connected
                </span>
              </div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">Key ID</label>
              <div className="flex gap-2">
                <input
                  type={showRazorpayKey ? "text" : "password"}
                  readOnly
                  value="rzp_live_XXXXXXXXXXXX"
                  className="flex-1 rounded-[3px] border border-gray-200 bg-gray-100 px-3 py-2 text-xs font-mono text-gray-600 outline-none"
                />
                <button onClick={() => setShowRazorpayKey(!showRazorpayKey)} className="rounded-[3px] border border-gray-300 px-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100">
                  {showRazorpayKey ? <EyeSlash className="h-4 w-4" weight="duotone" /> : <Eye className="h-4 w-4" weight="duotone" />}
                </button>
                {/* ponytail: key rotation is an env/ops task, not wired to this page */}
                <button className="flex items-center gap-1 rounded-[3px] border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100">
                  <ArrowsClockwise className="h-3.5 w-3.5" weight="duotone" /> Rotate
                </button>
              </div>
            </div>

            <div className="rounded-[4px] border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Envelope className="h-4 w-4 text-gray-500" weight="duotone" />
                <p className="text-xs font-bold text-gray-800">SMTP (Hostinger)</p>
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Operational
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">Host</label>
                  <input readOnly value="smtp.hostinger.com" className="w-full rounded-[3px] border border-gray-200 bg-gray-100 px-3 py-2 text-xs font-mono text-gray-600 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">From</label>
                  <input readOnly value="noreply@nnawca.org" className="w-full rounded-[3px] border border-gray-200 bg-gray-100 px-3 py-2 text-xs font-mono text-gray-600 outline-none" />
                </div>
              </div>
              {/* ponytail: test-email send lives in the email module, not this page */}
              <button className="mt-3 rounded-[3px] border border-gray-300 px-3 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-100">
                Send test email
              </button>
            </div>

            <div className="rounded-[4px] border border-gray-200 p-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-gray-500" weight="duotone" />
                <p className="text-xs font-bold text-gray-800">Cloudflare R2 Storage</p>
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Connected
                </span>
              </div>
              <p className="mt-2 text-[11px] text-gray-500">Bucket: the-parliament-media · 2.4 GB used</p>
            </div>
          </div>
        </section>
        )}

        {/* Danger zone — only the maintenance toggle persists; purge/delete are inert. */}
        {tab === "danger" && (
        <section className="rounded-[5px] border border-rose-200 bg-white overflow-hidden">
          <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 border-b border-rose-200/60 bg-rose-50/30">
            <Warning className="h-4 w-4 text-rose-600" weight="duotone" />
            <h2 className="text-sm font-bold text-rose-700">Danger Zone</h2>
          </div>
          <div className="px-4 sm:px-5 divide-y divide-gray-200">
            <div className="flex items-center gap-4 py-3.5">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800">Maintenance mode</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Takes the member site offline; admins keep access</p>
              </div>
              <Toggle on={maintenance.maintenanceMode}
                onChange={() => setMaintenance(m => ({ maintenanceMode: !m.maintenanceMode }))} />
              <SaveButton pending={isBusy("maintenance")} onClick={() => save("maintenance", maintenance)} />
            </div>
            <div className="flex items-center gap-4 py-3.5">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-800">Purge cached data</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Clears feed caches and recomputed counters</p>
              </div>
              {/* ponytail: destructive op intentionally not wired — inert */}
              <button className="flex items-center gap-1.5 rounded-[3px] border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100">
                <Power className="h-3.5 w-3.5" weight="duotone" /> Purge
              </button>
            </div>
            <div className="flex items-center gap-4 py-3.5">
              <div className="flex-1">
                <p className="text-xs font-semibold text-rose-600">Export and delete all platform data</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Irreversible. Requires two super-admin approvals.</p>
              </div>
              {/* ponytail: destructive op intentionally not wired — inert */}
              <button className="flex items-center gap-1.5 rounded-[3px] border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100/50">
                <Trash className="h-3.5 w-3.5" weight="duotone" /> Request Deletion
              </button>
            </div>
          </div>
        </section>
        )}

        </div>
      </div>
    </div>
  )
}
