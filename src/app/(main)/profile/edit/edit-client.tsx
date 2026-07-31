"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  UserCircle, Phone, GraduationCap, Share2, Trash2, Camera,
  Globe, Link2, AtSign, MessageCircle, X, SlidersHorizontal, Lock,
} from "lucide-react"
import { saveAccount, saveContact, saveProfessional, saveSocial, closeAccount } from "./actions"

export interface EditInitial {
  firstName: string; lastName: string; nickname: string; username: string; email: string
  dateOfBirth: string; gender: string; photoUrl: string; coverUrl: string; bio: string
  houseId: string; batchId: string; bloodGroup: string
  city: string; address: string; homeTown: string
  company: string; jobTitle: string; higherEducation: string; skills: string
  linkedin: string; github: string; twitter: string; facebook: string; instagram: string; website: string
  visibility: string
}
type Facets = { batches: { id: string; label: string }[]; houses: { id: string; name: string; colorHex: string }[] }
type TabKey = "account" | "contact" | "education" | "social" | "close"

const TABS: { key: TabKey; label: string; icon: typeof UserCircle }[] = [
  { key: "account", label: "Account", icon: UserCircle },
  { key: "contact", label: "Contact", icon: Phone },
  { key: "education", label: "Education & Profession", icon: GraduationCap },
  { key: "social", label: "Social Media Handles", icon: Share2 },
  { key: "close", label: "Close account", icon: Trash2 },
]
const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
const input = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors"

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={full ? "col-span-full" : ""}><label className="mb-1.5 block text-xs font-semibold text-gray-700">{label}</label>{children}</div>
}
function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="px-4 pt-4 sm:px-5"><h2 className="text-base font-bold text-gray-900">{title}</h2>{desc && <p className="mt-0.5 text-xs text-gray-500">{desc}</p>}</div>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </div>
  )
}
function SaveBar({ label = "Save changes", onSave }: { label?: string; onSave: () => Promise<void> }) {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle")
  const [err, setErr] = useState("")
  async function run() {
    setErr(""); setState("saving")
    try { await onSave(); setState("saved"); setTimeout(() => setState("idle"), 2000) }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed"); setState("idle") }
  }
  return (
    <div className="flex items-center justify-end gap-3">
      {err && <span className="text-xs text-red-600">{err}</span>}
      <button onClick={run} disabled={state === "saving"} className={`rounded-lg px-4 py-2 text-xs font-bold text-white transition-colors disabled:opacity-60 ${state === "saved" ? "bg-green-600" : "bg-brand hover:bg-brand-600"}`}>
        {state === "saving" ? "Saving…" : state === "saved" ? "Saved ✓" : label}
      </button>
    </div>
  )
}

export function EditProfileClient({ initial, facets }: { initial: EditInitial; facets: Facets }) {
  const router = useRouter()
  const [tab, setTab] = useState<TabKey>("account")
  const [navOpen, setNavOpen] = useState(false)
  const [f, setF] = useState(initial)
  const set = (patch: Partial<EditInitial>) => setF((prev) => ({ ...prev, ...patch }))
  // House and batch lock once set (based on the loaded value, not the edited state).
  const houseLocked = initial.houseId !== ""
  const batchLocked = initial.batchId !== ""

  const AccountTab = (
    <div className="space-y-4">
      <Card title="Account Settings" desc="Update your basic profile information shown across the platform.">
        <MiniHero
          photoUrl={f.photoUrl}
          coverUrl={f.coverUrl}
          onPhoto={(u) => { set({ photoUrl: u }); router.refresh() }}
          onCover={(u) => { set({ coverUrl: u }); router.refresh() }}
        />
        <div className="mt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="First name"><input className={input} value={f.firstName} onChange={(e) => set({ firstName: e.target.value })} /></Field>
            <Field label="Last name"><input className={input} value={f.lastName} onChange={(e) => set({ lastName: e.target.value })} /></Field>
            <Field label="Nickname (Optional)"><input className={input} placeholder="Kaalu" value={f.nickname} onChange={(e) => set({ nickname: e.target.value })} /></Field>
            <Field label="Username"><input className={input} value={f.username} onChange={(e) => set({ username: e.target.value })} /></Field>
            <Field label="Birthday"><input type="date" className={input} value={f.dateOfBirth} onChange={(e) => set({ dateOfBirth: e.target.value })} /></Field>
            <Field label="Gender">
              <div className="flex gap-2">
                {["male", "female", "other"].map((g) => (
                  <button key={g} onClick={() => set({ gender: g })} className={`flex-1 rounded-lg border py-2 text-xs font-semibold capitalize transition-colors ${f.gender === g ? "border-brand bg-brand/10 text-brand" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>{g}</button>
                ))}
              </div>
            </Field>
          </div>
        </div>
        <div className="mt-4">
          <Field label="Overview" full>
            <textarea rows={4} maxLength={128} className={input} value={f.bio} onChange={(e) => set({ bio: e.target.value })} />
            <p className="mt-1 text-[11px] text-gray-400">Character limit: 128 ({128 - f.bio.length} left)</p>
          </Field>
        </div>
        <div className="mt-4"><SaveBar onSave={saveAccountNow} /></div>
      </Card>

      <Card title="Details That May Help Alumni" desc="JNV-specific details that help fellow Navodayans find and connect with you.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="House">
            {houseLocked ? (
              <div className="flex items-center gap-2">
                <span className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: facets.houses.find((h) => h.id === f.houseId)?.colorHex ?? "#6c757d" }}>{facets.houses.find((h) => h.id === f.houseId)?.name ?? "—"}</span>
                <span className="flex items-center gap-1 text-[11px] text-gray-400"><Lock className="h-3 w-3" /> Locked</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {facets.houses.map((h) => (
                  <button key={h.id} onClick={() => set({ houseId: f.houseId === h.id ? "" : h.id })} className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-transform ${f.houseId === h.id ? "scale-105 ring-2 ring-gray-400 ring-offset-1" : "opacity-80 hover:opacity-100"}`} style={{ backgroundColor: h.colorHex }}>{h.name}</button>
                ))}
              </div>
            )}
          </Field>
          <Field label="Batch">
            {batchLocked ? (
              <div className="flex items-center gap-2">
                <span className={`${input} inline-flex w-auto bg-gray-50`}>{facets.batches.find((b) => b.id === f.batchId)?.label ?? "—"}</span>
                <span className="flex items-center gap-1 whitespace-nowrap text-[11px] text-gray-400"><Lock className="h-3 w-3" /> Locked</span>
              </div>
            ) : (
              <select className={input} value={f.batchId} onChange={(e) => set({ batchId: e.target.value })}>
                <option value="">Select Batch</option>
                {facets.batches.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
            )}
          </Field>
        </div>
        {(houseLocked || batchLocked) && <p className="mt-2 text-[11px] text-gray-400">House and batch can&rsquo;t be changed once set. Contact an admin to correct a mistake.</p>}
        <div className="mt-4">
          <Field label="Blood Group" full>
            <div className="flex flex-wrap gap-2">
              {BLOOD.map((bg) => (
                <button key={bg} onClick={() => set({ bloodGroup: f.bloodGroup === bg ? "" : bg })} className={`h-9 min-w-[3rem] rounded-lg border text-sm font-bold transition-colors ${f.bloodGroup === bg ? "border-red-500 bg-red-500 text-white" : "border-red-300 bg-white text-red-500 hover:bg-red-50"}`}>{bg}</button>
              ))}
            </div>
          </Field>
        </div>
        <div className="mt-4"><SaveBar onSave={saveAccountNow} /></div>
      </Card>
    </div>
  )

  async function saveAccountNow() {
    await saveAccount({
      firstName: f.firstName, lastName: f.lastName, nickname: f.nickname, username: f.username,
      dateOfBirth: f.dateOfBirth || undefined, gender: f.gender || undefined, bio: f.bio,
      houseId: f.houseId || undefined, batchId: f.batchId || undefined, bloodGroup: f.bloodGroup || undefined,
    })
  }

  const ContactTab = (
    <Card title="Contact Details" desc="Keep your contact details updated for better networking.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Address" full><input className={input} placeholder="Street address" value={f.address} onChange={(e) => set({ address: e.target.value })} /></Field>
        <Field label="City"><input className={input} value={f.city} onChange={(e) => set({ city: e.target.value })} /></Field>
        <Field label="Home Town"><input className={input} value={f.homeTown} onChange={(e) => set({ homeTown: e.target.value })} /></Field>
        <Field label="Primary Email"><input className={`${input} bg-gray-50`} value={f.email} readOnly /></Field>
      </div>
      <p className="mt-3 text-[11px] text-gray-400">Email changes and emergency contacts aren&rsquo;t editable here yet.</p>
      <div className="mt-4"><SaveBar label="Update Contact" onSave={() => saveContact({ city: f.city, address: f.address, homeTown: f.homeTown })} /></div>
    </Card>
  )

  const EducationTab = (
    <Card title="Profession & Education" desc="Your current role and academic background.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Current Company"><input className={input} placeholder="Company name" value={f.company} onChange={(e) => set({ company: e.target.value })} /></Field>
        <Field label="Job Title"><input className={input} placeholder="Your position" value={f.jobTitle} onChange={(e) => set({ jobTitle: e.target.value })} /></Field>
        <Field label="Highest Education / Institution" full><input className={input} placeholder="e.g. B.Tech, VNIT Nagpur" value={f.higherEducation} onChange={(e) => set({ higherEducation: e.target.value })} /></Field>
        <Field label="Key Skills (comma separated)" full><input className={input} placeholder="SEO, Project Management, Design" value={f.skills} onChange={(e) => set({ skills: e.target.value })} /></Field>
      </div>
      <div className="mt-4"><SaveBar label="Save Details" onSave={() => saveProfessional({ company: f.company, jobTitle: f.jobTitle, higherEducation: f.higherEducation, skills: f.skills })} /></div>
    </Card>
  )

  const SOCIALS = [
    { key: "linkedin" as const, label: "LinkedIn", color: "#0A66C2", icon: Link2 },
    { key: "github" as const, label: "GitHub", color: "#181717", icon: Link2 },
    { key: "twitter" as const, label: "Twitter / X", color: "#1DA1F2", icon: AtSign },
    { key: "facebook" as const, label: "Facebook", color: "#1877F2", icon: Share2 },
    { key: "instagram" as const, label: "Instagram", color: "#d6249f", icon: MessageCircle },
    { key: "website" as const, label: "Personal Website", color: "#0d6efd", icon: Globe },
  ]
  const SocialTab = (
    <Card title="Social Media & Online Presence" desc="Connect your social profiles to expand your network.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SOCIALS.map((s) => (
          <Field key={s.key} label={s.label}>
            <div className="flex overflow-hidden rounded-lg border border-gray-200 transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10">
              <span className="flex w-10 items-center justify-center text-white" style={{ background: s.color }}><s.icon className="h-4 w-4" /></span>
              <input type="url" placeholder={`https://…`} value={f[s.key]} onChange={(e) => set({ [s.key]: e.target.value } as Partial<EditInitial>)} className="flex-1 px-3 py-2 text-sm outline-none" />
            </div>
          </Field>
        ))}
      </div>
      <div className="mt-5">
        <label className="mb-2 block text-xs font-semibold text-gray-700">Profile Visibility</label>
        <div className="space-y-2">
          {[
            { v: "public", label: "Public", sub: "Visible to all alumni and search engines" },
            { v: "alumni", label: "Alumni Only", sub: "Visible only to verified alumni" },
            { v: "private", label: "Private", sub: "Visible only to you" },
          ].map((o) => (
            <label key={o.v} className="flex cursor-pointer items-start gap-2.5">
              <input type="radio" name="visibility" checked={f.visibility === o.v} onChange={() => set({ visibility: o.v })} className="mt-0.5 h-4 w-4 accent-brand" />
              <span className="text-sm text-gray-700"><span className="font-semibold">{o.label}</span> — {o.sub}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="mt-4"><SaveBar label="Update Social Profiles" onSave={() => saveSocial({ linkedin: f.linkedin, github: f.github, twitter: f.twitter, facebook: f.facebook, instagram: f.instagram, website: f.website, visibility: f.visibility })} /></div>
    </Card>
  )

  const CloseTab = <CloseAccount />

  const SideNav = (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <ul className="space-y-1 p-2">
        {TABS.map((t) => (
          <li key={t.key}>
            <button onClick={() => { setTab(t.key); setNavOpen(false) }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${tab === t.key ? "bg-brand/10 text-brand" : "text-gray-600 hover:bg-gray-50"}`}>
              <t.icon className={`h-[18px] w-[18px] ${tab === t.key ? "text-brand" : "text-gray-400"}`} /> {t.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="border-t border-gray-100 py-2.5 text-center">
        <a href={`/${f.username}`} className="text-xs font-medium text-gray-500 hover:text-brand">View Profile</a>
      </div>
    </div>
  )

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#f3f2ef] pb-6">
      <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 sm:py-6">
        <button onClick={() => setNavOpen(true)} className="mb-4 flex items-center gap-2 lg:hidden">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white"><SlidersHorizontal className="h-4 w-4" /></span>
          <span className="text-base font-bold text-gray-900">Settings</span>
        </button>
        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="hidden w-[280px] flex-shrink-0 lg:block"><div className="sticky top-[72px]">{SideNav}</div></div>
          <div className="min-w-0 flex-1">
            {tab === "account" && AccountTab}
            {tab === "contact" && ContactTab}
            {tab === "education" && EducationTab}
            {tab === "social" && SocialTab}
            {tab === "close" && CloseTab}
          </div>
        </div>
      </div>
      {navOpen && (
        <>
          <div role="presentation" className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setNavOpen(false)} />
          <div className="fixed left-0 top-0 z-50 h-full w-72 overflow-y-auto bg-[#f3f2ef] p-4 shadow-xl lg:hidden">
            <div className="mb-3 flex justify-end"><button onClick={() => setNavOpen(false)} className="text-gray-400"><X className="h-5 w-5" /></button></div>
            {SideNav}
          </div>
        </>
      )}
    </div>
  )

  function CloseAccount() {
    const [confirm, setConfirm] = useState(false)
    const [busy, setBusy] = useState(false)
    async function del() {
      setBusy(true)
      try { await closeAccount(); await signOut({ callbackUrl: "/" }) } catch { setBusy(false) }
    }
    return (
      <Card title="Delete account" desc="This action is permanent. Read the notes below before continuing.">
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-600">
          <li>If you delete your account, your profile is removed and you lose access.</li>
        </ul>
        <label className="my-4 flex cursor-pointer items-center gap-2.5">
          <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="h-4 w-4 accent-red-500" />
          <span className="text-sm text-gray-700">Yes, I&rsquo;d like to delete my account</span>
        </label>
        <button disabled={!confirm || busy} onClick={del} className="rounded-lg bg-red-500 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? "Deleting…" : "Delete my account"}
        </button>
      </Card>
    )
  }
}

const DEFAULT_COVER = "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1400&q=70"

function useImageUpload(endpoint: string, field: "photoUrl" | "coverUrl", onDone: (url: string) => void) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErr(""); setBusy(true)
    const body = new FormData(); body.append("file", file)
    const res = await fetch(endpoint, { method: "POST", body })
    setBusy(false)
    if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d.error ?? "Upload failed"); return }
    const d = await res.json(); onDone(d[field])
  }
  return { inputRef, busy, err, onFile }
}

function MiniHero({
  photoUrl, coverUrl, onPhoto, onCover,
}: {
  photoUrl: string
  coverUrl: string
  onPhoto: (url: string) => void
  onCover: (url: string) => void
}) {
  const photo = useImageUpload("/api/profile/photo", "photoUrl", onPhoto)
  const cover = useImageUpload("/api/profile/cover", "coverUrl", onCover)
  const coverSrc = coverUrl || DEFAULT_COVER
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200">
      <button
        type="button"
        onClick={() => cover.inputRef.current?.click()}
        disabled={cover.busy}
        className="group relative block h-[120px] w-full sm:h-[160px]"
      >
        <Image src={coverSrc} alt="" fill sizes="100vw" className="h-full w-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <Camera className="h-4 w-4" />
          <span className="text-xs font-semibold">{cover.busy ? "Uploading…" : "Change cover"}</span>
        </span>
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-[11px] font-semibold text-gray-700 shadow-sm group-hover:bg-white">
          <Camera className="h-3.5 w-3.5" /> Cover
        </span>
      </button>
      <input ref={cover.inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={cover.onFile} />

      <div className="relative flex items-end gap-3 bg-white px-4 pb-3 pt-0 sm:px-5">
        <button
          type="button"
          onClick={() => photo.inputRef.current?.click()}
          disabled={photo.busy}
          className="group relative -mt-10 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gray-100 shadow-sm sm:h-28 sm:w-28"
        >
          <Image src={photoUrl} alt="" fill sizes="(max-width: 768px) 100vw, 400px" className="h-full w-full object-cover" />
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="h-5 w-5" />
            <span className="text-[10px] font-semibold">{photo.busy ? "…" : "Change"}</span>
          </span>
        </button>
        <input ref={photo.inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={photo.onFile} />
        <div className="pb-1 text-[11px] text-gray-500">
          <div>Click the cover or avatar to change.</div>
          <div className="text-gray-400">PNG, JPEG or WebP — cover up to 8 MB, avatar up to 5 MB.</div>
          {(photo.err || cover.err) && <div className="mt-1 text-red-600">{photo.err || cover.err}</div>}
        </div>
      </div>
    </div>
  )
}
