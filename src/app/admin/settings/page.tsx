"use client"

import { useState } from "react"
import {
  Settings, Save, CheckCircle2, Globe, UserPlus, ToggleLeft,
  Mail, CreditCard, AlertTriangle, Eye, EyeOff, School,
  ShieldCheck, Database, Trash2, Power, KeyRound, RefreshCcw,
} from "lucide-react"
import { PageHeader } from "../admin-ui"

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className={`relative h-6 w-11 rounded-full transition-colors flex-shrink-0 ${on ? "bg-indigo-600" : "bg-slate-200"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  )
}

function SettingRow({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800">{label}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
      </div>
      {children}
    </div>
  )
}

export default function AdminSettingsPage() {
  const [saved, setSaved] = useState(false)
  const [showRazorpayKey, setShowRazorpayKey] = useState(false)

  const [general, setGeneral] = useState({
    siteName: "The Parliament",
    orgName: "Nagpur Navodaya Alumni Welfare and Charitable Association (NNAWCA)",
    supportEmail: "support@nnawca.org",
    school: "JNV Nagpur (NGP)",
  })

  const [flags, setFlags] = useState({
    openRegistration: true,
    requireVerification: true,
    guardianConsent: true,
    googleOAuth: true,
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
        description="Global configuration for The Parliament"
        actions={
          <button onClick={save}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors ${saved ? "bg-emerald-600" : "bg-indigo-600 hover:bg-indigo-700"}`}>
            {saved ? <><CheckCircle2 className="h-3.5 w-3.5" /> Saved</> : <><Save className="h-3.5 w-3.5" /> Save All</>}
          </button>
        }
      />

      <div className="space-y-4">

        {/* General */}
        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 border-b border-slate-100">
            <Globe className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900">General</h2>
          </div>
          <div className="p-4 sm:p-5 space-y-4">
            {[
              { key: "siteName" as const, label: "Platform Name" },
              { key: "orgName" as const, label: "Legal Organization Name" },
              { key: "supportEmail" as const, label: "Support Email" },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">{f.label}</label>
                <input
                  value={general[f.key]}
                  onChange={e => { setGeneral(g => ({ ...g, [f.key]: e.target.value })); setSaved(false) }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Active School</label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <School className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs text-slate-600">{general.school}</span>
                <span className="ml-auto rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">Multi-school ready</span>
              </div>
            </div>
          </div>
        </section>

        {/* Registration & access */}
        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 border-b border-slate-100">
            <UserPlus className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-bold text-slate-900">Registration & Access</h2>
          </div>
          <div className="px-4 sm:px-5 divide-y divide-slate-50">
            <SettingRow label="Open registration" desc="Anyone can sign up; off means invite-only">
              <Toggle on={flags.openRegistration} onChange={() => toggle("openRegistration")} />
            </SettingRow>
            <SettingRow label="Require verification for posting" desc="Unverified users can browse but not post">
              <Toggle on={flags.requireVerification} onChange={() => toggle("requireVerification")} />
            </SettingRow>
            <SettingRow label="Guardian consent for minors" desc="Required by policy for users under 18">
              <Toggle on={flags.guardianConsent} onChange={() => toggle("guardianConsent")} />
            </SettingRow>
            <SettingRow label="Google OAuth sign-in" desc="Allow sign-in with Google alongside credentials">
              <Toggle on={flags.googleOAuth} onChange={() => toggle("googleOAuth")} />
            </SettingRow>
            <SettingRow label="Onboarding gate" desc="Force new users through the onboarding wizard">
              <Toggle on={flags.onboardingGate} onChange={() => toggle("onboardingGate")} />
            </SettingRow>
          </div>
        </section>

        {/* Feature flags */}
        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 border-b border-slate-100">
            <ToggleLeft className="h-4 w-4 text-violet-500" />
            <h2 className="text-sm font-bold text-slate-900">Feature Modules</h2>
          </div>
          <div className="px-4 sm:px-5 divide-y divide-slate-50">
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
        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 border-b border-slate-100">
            <KeyRound className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">Integrations</h2>
          </div>
          <div className="p-4 sm:p-5 space-y-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-slate-400" />
                <p className="text-xs font-bold text-slate-800">Razorpay</p>
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Connected
                </span>
              </div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Key ID</label>
              <div className="flex gap-2">
                <input
                  type={showRazorpayKey ? "text" : "password"}
                  readOnly
                  value="rzp_live_XXXXXXXXXXXX"
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-500 outline-none"
                />
                <button onClick={() => setShowRazorpayKey(!showRazorpayKey)} className="rounded-lg border border-slate-200 px-3 text-slate-400 hover:text-slate-600">
                  {showRazorpayKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  <RefreshCcw className="h-3.5 w-3.5" /> Rotate
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="h-4 w-4 text-slate-400" />
                <p className="text-xs font-bold text-slate-800">SMTP (Hostinger)</p>
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Operational
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Host</label>
                  <input readOnly value="smtp.hostinger.com" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">From</label>
                  <input readOnly value="noreply@nnawca.org" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-500 outline-none" />
                </div>
              </div>
              <button className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
                Send test email
              </button>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-slate-400" />
                <p className="text-xs font-bold text-slate-800">Cloudflare R2 Storage</p>
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Connected
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">Bucket: the-parliament-media · 2.4 GB used</p>
            </div>
          </div>
        </section>

        {/* Danger zone */}
        <section className="rounded-xl border border-rose-200 bg-white overflow-hidden">
          <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 border-b border-rose-100 bg-rose-50/50">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            <h2 className="text-sm font-bold text-rose-700">Danger Zone</h2>
          </div>
          <div className="px-4 sm:px-5 divide-y divide-slate-50">
            <SettingRow label="Maintenance mode" desc="Takes the member site offline; admins keep access">
              <Toggle on={flags.maintenanceMode} onChange={() => toggle("maintenanceMode")} />
            </SettingRow>
            <div className="flex items-center gap-4 py-3.5">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-800">Purge cached data</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Clears feed caches and recomputed counters</p>
              </div>
              <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                <Power className="h-3.5 w-3.5" /> Purge
              </button>
            </div>
            <div className="flex items-center gap-4 py-3.5">
              <div className="flex-1">
                <p className="text-xs font-semibold text-rose-600">Export and delete all platform data</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Irreversible. Requires two super-admin approvals.</p>
              </div>
              <button className="flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50">
                <Trash2 className="h-3.5 w-3.5" /> Request Deletion
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
