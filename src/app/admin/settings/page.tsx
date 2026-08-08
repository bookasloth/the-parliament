"use client"

import { useState } from "react"
import {
  FloppyDisk, CheckCircle, Globe, UserPlus, ToggleLeft,
  Envelope, CreditCard, Warning, Eye, EyeSlash, GraduationCap,
  Database, Trash, Power, Key, ArrowsClockwise,
} from "@phosphor-icons/react"
import { PageHeader } from "../admin-ui"

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className={`relative h-6 w-11 rounded-full transition-colors flex-shrink-0 ${on ? "bg-blue-600" : "bg-zinc-700"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-[3px] bg-white shadow transition-transform ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  )
}

function SettingRow({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-zinc-200">{label}</p>
        <p className="text-[11px] text-zinc-500 mt-0.5">{desc}</p>
      </div>
      {children}
    </div>
  )
}

export default function AdminSettingsPage() {
  const [saved, setSaved] = useState(false)
  const [showRazorpayKey, setShowRazorpayKey] = useState(false)

  const [general, setGeneral] = useState({
    siteName: "NNAWCA",
    orgName: "Nagpur Navodaya Alumni Welfare and Charitable Association (NNAWCA)",
    supportEmail: "support@nnawca.org",
    school: "JNV Nagpur (NGP)",
  })

  const [flags, setFlags] = useState({
    openRegistration: true,
    requireVerification: true,
    guardianConsent: true,
    onboardingGate: true,
    feed: true,
    messaging: true,
    groups: true,
    events: true,
    membership: true,
    businessDirectory: false,
    jobBoard: false,
    games: false,
    maintenanceMode: false,
  })

  function toggle(key: keyof typeof flags) {
    setFlags(f => ({ ...f, [key]: !f[key] }))
    setSaved(false)
  }

  function save() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Platform Settings"
        description="Global configuration for NNAWCA"
        actions={
          <button onClick={save}
            className={`flex items-center gap-1.5 rounded-[3px] px-4 py-2 text-xs font-semibold text-white transition-colors ${saved ? "bg-emerald-600" : "bg-blue-600 hover:bg-blue-500"}`}>
            {saved ? <><CheckCircle className="h-3.5 w-3.5" weight="duotone" /> Saved</> : <><FloppyDisk className="h-3.5 w-3.5" weight="duotone" /> Save All</>}
          </button>
        }
      />

      <div className="space-y-4">

        {/* General */}
        <section className="rounded-[5px] border border-zinc-800 bg-[#111113] overflow-hidden">
          <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 border-b border-zinc-800">
            <Globe className="h-4 w-4 text-blue-400" weight="duotone" />
            <h2 className="text-sm font-bold text-zinc-100">General</h2>
          </div>
          <div className="p-4 sm:p-5 space-y-4">
            {[
              { key: "siteName" as const, label: "Platform Name" },
              { key: "orgName" as const, label: "Legal Organization Name" },
              { key: "supportEmail" as const, label: "Support Email" },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-500 mb-1">{f.label}</label>
                <input
                  value={general[f.key]}
                  onChange={e => { setGeneral(g => ({ ...g, [f.key]: e.target.value })); setSaved(false) }}
                  className="w-full rounded-[3px] border border-zinc-800 bg-[#0a0a0a] px-3 py-2 text-xs text-zinc-200 outline-none focus:border-blue-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-500 mb-1">Active School</label>
              <div className="flex items-center gap-2 rounded-[3px] border border-zinc-800 bg-zinc-900 px-3 py-2">
                <GraduationCap className="h-3.5 w-3.5 text-zinc-500" weight="duotone" />
                <span className="text-xs text-zinc-400">{general.school}</span>
                <span className="ml-auto rounded-[3px] bg-blue-950/40 px-1.5 py-0.5 text-[10px] font-bold text-blue-400">Multi-school ready</span>
              </div>
            </div>
          </div>
        </section>

        {/* Registration & access */}
        <section className="rounded-[5px] border border-zinc-800 bg-[#111113] overflow-hidden">
          <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 border-b border-zinc-800">
            <UserPlus className="h-4 w-4 text-emerald-400" weight="duotone" />
            <h2 className="text-sm font-bold text-zinc-100">Registration & Access</h2>
          </div>
          <div className="px-4 sm:px-5 divide-y divide-zinc-800">
            <SettingRow label="Open registration" desc="Anyone can sign up; off means invite-only">
              <Toggle on={flags.openRegistration} onChange={() => toggle("openRegistration")} />
            </SettingRow>
            <SettingRow label="Require verification for posting" desc="Unverified users can browse but not post">
              <Toggle on={flags.requireVerification} onChange={() => toggle("requireVerification")} />
            </SettingRow>
            <SettingRow label="Guardian consent for minors" desc="Required by policy for users under 18">
              <Toggle on={flags.guardianConsent} onChange={() => toggle("guardianConsent")} />
            </SettingRow>
            <SettingRow label="Onboarding gate" desc="Force new users through the onboarding wizard">
              <Toggle on={flags.onboardingGate} onChange={() => toggle("onboardingGate")} />
            </SettingRow>
          </div>
        </section>

        {/* Feature flags */}
        <section className="rounded-[5px] border border-zinc-800 bg-[#111113] overflow-hidden">
          <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 border-b border-zinc-800">
            <ToggleLeft className="h-4 w-4 text-violet-400" weight="duotone" />
            <h2 className="text-sm font-bold text-zinc-100">Feature Modules</h2>
          </div>
          <div className="px-4 sm:px-5 divide-y divide-zinc-800">
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
                <Toggle on={flags[f.key]} onChange={() => toggle(f.key)} />
              </SettingRow>
            ))}
          </div>
        </section>

        {/* Integrations */}
        <section className="rounded-[5px] border border-zinc-800 bg-[#111113] overflow-hidden">
          <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 border-b border-zinc-800">
            <Key className="h-4 w-4 text-amber-400" weight="duotone" />
            <h2 className="text-sm font-bold text-zinc-100">Integrations</h2>
          </div>
          <div className="p-4 sm:p-5 space-y-4">
            <div className="rounded-[4px] border border-zinc-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-zinc-500" weight="duotone" />
                <p className="text-xs font-bold text-zinc-200">Razorpay</p>
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Connected
                </span>
              </div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-500 mb-1">Key ID</label>
              <div className="flex gap-2">
                <input
                  type={showRazorpayKey ? "text" : "password"}
                  readOnly
                  value="rzp_live_XXXXXXXXXXXX"
                  className="flex-1 rounded-[3px] border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-400 outline-none"
                />
                <button onClick={() => setShowRazorpayKey(!showRazorpayKey)} className="rounded-[3px] border border-zinc-700 px-3 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">
                  {showRazorpayKey ? <EyeSlash className="h-4 w-4" weight="duotone" /> : <Eye className="h-4 w-4" weight="duotone" />}
                </button>
                <button className="flex items-center gap-1 rounded-[3px] border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800">
                  <ArrowsClockwise className="h-3.5 w-3.5" weight="duotone" /> Rotate
                </button>
              </div>
            </div>

            <div className="rounded-[4px] border border-zinc-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Envelope className="h-4 w-4 text-zinc-500" weight="duotone" />
                <p className="text-xs font-bold text-zinc-200">SMTP (Hostinger)</p>
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Operational
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-500 mb-1">Host</label>
                  <input readOnly value="smtp.hostinger.com" className="w-full rounded-[3px] border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-400 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-500 mb-1">From</label>
                  <input readOnly value="noreply@nnawca.org" className="w-full rounded-[3px] border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-400 outline-none" />
                </div>
              </div>
              <button className="mt-3 rounded-[3px] border border-zinc-700 px-3 py-1.5 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-800">
                Send test email
              </button>
            </div>

            <div className="rounded-[4px] border border-zinc-800 p-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-zinc-500" weight="duotone" />
                <p className="text-xs font-bold text-zinc-200">Cloudflare R2 Storage</p>
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Connected
                </span>
              </div>
              <p className="mt-2 text-[11px] text-zinc-500">Bucket: the-parliament-media · 2.4 GB used</p>
            </div>
          </div>
        </section>

        {/* Danger zone */}
        <section className="rounded-[5px] border border-rose-900 bg-[#111113] overflow-hidden">
          <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 border-b border-rose-900/60 bg-rose-950/30">
            <Warning className="h-4 w-4 text-rose-400" weight="duotone" />
            <h2 className="text-sm font-bold text-rose-300">Danger Zone</h2>
          </div>
          <div className="px-4 sm:px-5 divide-y divide-zinc-800">
            <SettingRow label="Maintenance mode" desc="Takes the member site offline; admins keep access">
              <Toggle on={flags.maintenanceMode} onChange={() => toggle("maintenanceMode")} />
            </SettingRow>
            <div className="flex items-center gap-4 py-3.5">
              <div className="flex-1">
                <p className="text-xs font-semibold text-zinc-200">Purge cached data</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Clears feed caches and recomputed counters</p>
              </div>
              <button className="flex items-center gap-1.5 rounded-[3px] border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800">
                <Power className="h-3.5 w-3.5" weight="duotone" /> Purge
              </button>
            </div>
            <div className="flex items-center gap-4 py-3.5">
              <div className="flex-1">
                <p className="text-xs font-semibold text-rose-400">Export and delete all platform data</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Irreversible. Requires two super-admin approvals.</p>
              </div>
              <button className="flex items-center gap-1.5 rounded-[3px] border border-rose-800 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/50">
                <Trash className="h-3.5 w-3.5" weight="duotone" /> Request Deletion
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
