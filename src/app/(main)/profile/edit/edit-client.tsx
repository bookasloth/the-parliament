"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  UserCircle, Phone, GraduationCap, Share2, Trash2, Camera,
  Globe, Link2, AtSign, MessageCircle, X, SlidersHorizontal, Lock,
  Plus, Pencil, Briefcase, School,
  Sparkles, ArrowRight, Check, Loader2, AlertCircle,
} from "lucide-react"
import { AlumniProfileCard } from "@/components/shared/AlumniProfileCard"
import type { AlumniCard, Membership } from "@/lib/homepage-data"
import { computeStrength, type StrengthTab } from "@/lib/profile-strength"
import { housesForContext } from "@/config/houses"
import {
  saveAccount, saveContact, saveProfessional, saveSocial, closeAccount,
  saveExperience, deleteExperience, saveEducation, deleteEducation,
} from "./actions"

export interface ExpRow {
  id?: string; title: string; company: string; employmentType: string
  location: string; locationType: string; current: boolean
  startMonth?: number; startYear?: number; endMonth?: number; endYear?: number
  description: string; skills: string
}
export interface EduRow {
  id?: string; school: string; degree: string; fieldOfStudy: string
  startYear?: number; endYear?: number
}

export interface EditInitial {
  firstName: string; lastName: string; nickname: string; username: string; email: string
  dateOfBirth: string; gender: string; photoUrl: string; coverUrl: string; bio: string; headline: string
  houseId: string; batchId: string; bloodGroup: string; bloodDonor: boolean
  city: string; address: string; homeTown: string; phone: string; whatsappOptIn: boolean
  company: string; jobTitle: string; industry: string; department: string; workSince: string
  higherEducation: string; skills: string
  linkedin: string; github: string; twitter: string; facebook: string; instagram: string; website: string
  visibility: string; showOnMap: boolean; isPublicIndexed: boolean
  membershipStatus: string
}
type Facets = {
  batches: { id: string; label: string; startYear?: number }[]
  houses: { id: string; name: string; colorHex: string; system: string; gender: string | null }[]
  industries?: { name: string; count: number }[]
  cities?: string[]
}
type TabKey = "account" | "contact" | "education" | "social" | "close"

const TABS: { key: TabKey; label: string; icon: typeof UserCircle }[] = [
  { key: "account", label: "Account", icon: UserCircle },
  { key: "contact", label: "Contact", icon: Phone },
  { key: "education", label: "Education & Profession", icon: GraduationCap },
  { key: "social", label: "Social & Privacy", icon: Share2 },
  { key: "close", label: "Close account", icon: Trash2 },
]
const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
const input = "w-full rounded-[4px] border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors"

function Field({ label, hint, children, full }: { label: string; hint?: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-full" : ""}>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
        {label}
        {hint && <span className="rounded-[3px] bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand">{hint}</span>}
      </label>
      {children}
    </div>
  )
}
function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[4px] border border-gray-200 bg-white">
      <div className="px-4 pt-4 sm:px-5"><h2 className="text-base font-bold text-gray-900">{title}</h2>{desc && <p className="mt-0.5 text-xs text-gray-500">{desc}</p>}</div>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </div>
  )
}
function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="flex w-full items-center gap-3 rounded-[4px] border border-gray-200 px-3 py-2.5 text-left transition-colors hover:border-gray-300">
      <span className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${on ? "bg-brand" : "bg-gray-300"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-gray-800">{label}</span>
        {hint && <span className="block text-[11px] text-gray-400">{hint}</span>}
      </span>
    </button>
  )
}
function SaveBar({ label = "Save changes", onSave, onSaved }: { label?: string; onSave: () => Promise<void>; onSaved?: () => void }) {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle")
  const [err, setErr] = useState("")
  async function run() {
    setErr(""); setState("saving")
    try { await onSave(); onSaved?.(); setState("saved"); setTimeout(() => setState("idle"), 2000) }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed"); setState("idle") }
  }
  return (
    <div className="flex items-center justify-end gap-3">
      {err && <span className="text-xs text-red-600">{err}</span>}
      <button onClick={run} disabled={state === "saving"} className={`rounded-[4px] px-4 py-2 text-xs font-bold text-white transition-colors disabled:opacity-60 ${state === "saved" ? "bg-green-600" : "bg-brand hover:bg-brand-600"}`}>
        {state === "saving" ? "Saving…" : state === "saved" ? "Saved ✓" : label}
      </button>
    </div>
  )
}

/** Animated completion ring (SVG so the arc tweens smoothly). */
function StrengthRing({ score, color }: { score: number; color: string }) {
  const r = 30
  const c = 2 * Math.PI * r
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="flex-shrink-0">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#e6e9ee" strokeWidth="7" />
      <circle
        cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} transform="rotate(-90 36 36)"
        style={{ transition: "stroke-dashoffset .6s ease, stroke .3s" }}
      />
      <text x="36" y="41" textAnchor="middle" className="fill-gray-900 text-[16px] font-extrabold">{score}%</text>
    </svg>
  )
}

export function EditProfileClient({ initial, facets, experiences, educations }: { initial: EditInitial; facets: Facets; experiences: ExpRow[]; educations: EduRow[] }) {
  const router = useRouter()
  const [tab, setTab] = useState<TabKey>("account")
  const [navOpen, setNavOpen] = useState(false)
  const [f, setF] = useState(initial)
  const set = (patch: Partial<EditInitial>) => setF((prev) => ({ ...prev, ...patch }))
  const houseLocked = initial.houseId !== ""
  const batchLocked = initial.batchId !== ""

  // House options depend on the selected batch's era + the member's gender:
  // pre-2002 boys/girls houses vs post-2002 ANSU houses (see @/config/houses).
  const selectedStartYear = facets.batches.find((b) => b.id === f.batchId)?.startYear ?? null
  const visibleHouses = useMemo(
    () => (houseLocked ? facets.houses : housesForContext(facets.houses, selectedStartYear, f.gender)),
    [houseLocked, facets.houses, selectedStartYear, f.gender],
  )
  // If a change to batch/gender makes the picked (unlocked) house invalid, clear it.
  useEffect(() => {
    if (!houseLocked && f.houseId && !visibleHouses.some((h) => h.id === f.houseId)) {
      set({ houseId: "" })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleHouses])

  // Dirty guard — warn before leaving with unsaved edits.
  const dirty = useMemo(() => JSON.stringify(f) !== JSON.stringify(initial), [f, initial])
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = "" }
    window.addEventListener("beforeunload", h)
    return () => window.removeEventListener("beforeunload", h)
  }, [dirty])

  // ---- Live username availability ----
  const [usernameState, setUsernameState] = useState<{ status: "idle" | "checking" | "available" | "taken" | "invalid"; msg?: string }>({ status: "idle" })
  useEffect(() => {
    const raw = f.username.trim()
    // Unchanged from what's saved → nothing to check.
    if (raw === initial.username) { setUsernameState({ status: "idle" }); return }
    if (!raw) { setUsernameState({ status: "invalid", msg: "Username is required" }); return }
    setUsernameState({ status: "checking" })
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/profile/username-check?u=${encodeURIComponent(raw)}`, { signal: ctrl.signal })
        const d = await res.json()
        if (d.available) setUsernameState({ status: "available", msg: `${d.slug} is available` })
        else setUsernameState({ status: d.reason === "That username is taken" ? "taken" : "invalid", msg: d.reason })
      } catch (e) {
        if ((e as Error).name !== "AbortError") setUsernameState({ status: "idle" })
      }
    }, 450)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [f.username, initial.username])
  const usernameBlocksSave = usernameState.status === "taken" || usernameState.status === "invalid"

  // ---- Debounced autosave (per editable tab) ----
  const [autoStatus, setAutoStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [autoErr, setAutoErr] = useState("")
  const savedSlices = useRef<Record<string, string>>({})

  // The serialized slice + save thunk for each editable tab.
  const tabSave = useMemo(() => ({
    account: {
      slice: JSON.stringify([f.firstName, f.lastName, f.nickname, f.username, f.dateOfBirth, f.gender, f.bio, f.headline, f.houseId, f.batchId, f.bloodGroup, f.bloodDonor]),
      run: () => saveAccount({ firstName: f.firstName, lastName: f.lastName, nickname: f.nickname, username: f.username, dateOfBirth: f.dateOfBirth || undefined, gender: f.gender || undefined, bio: f.bio, headline: f.headline, houseId: f.houseId || undefined, batchId: f.batchId || undefined, bloodGroup: f.bloodGroup || undefined, bloodDonor: f.bloodDonor }),
      blocked: usernameBlocksSave || usernameState.status === "checking",
    },
    contact: {
      slice: JSON.stringify([f.city, f.address, f.homeTown, f.phone, f.whatsappOptIn]),
      run: () => saveContact({ city: f.city, address: f.address, homeTown: f.homeTown, phone: f.phone, whatsappOptIn: f.whatsappOptIn }),
      blocked: false,
    },
    education: {
      slice: JSON.stringify([f.company, f.jobTitle, f.industry, f.department, f.workSince, f.higherEducation, f.skills]),
      run: () => saveProfessional({ company: f.company, jobTitle: f.jobTitle, industry: f.industry, department: f.department, workSince: f.workSince, higherEducation: f.higherEducation, skills: f.skills }),
      blocked: false,
    },
    social: {
      slice: JSON.stringify([f.linkedin, f.github, f.twitter, f.facebook, f.instagram, f.website, f.visibility, f.showOnMap, f.isPublicIndexed]),
      run: () => saveSocial({ linkedin: f.linkedin, github: f.github, twitter: f.twitter, facebook: f.facebook, instagram: f.instagram, website: f.website, visibility: f.visibility, showOnMap: f.showOnMap, isPublicIndexed: f.isPublicIndexed }),
      blocked: false,
    },
  }), [f, usernameBlocksSave, usernameState.status])

  // Seed the "already saved" snapshot once so autosave doesn't fire on first render.
  const seeded = useRef(false)
  if (!seeded.current) {
    for (const [k, v] of Object.entries(tabSave)) savedSlices.current[k] = v.slice
    seeded.current = true
  }

  const markSaved = useCallback((key: string, slice: string) => { savedSlices.current[key] = slice }, [])

  const current = tab === "close" ? null : tabSave[tab]
  useEffect(() => {
    if (!current) return
    if (current.slice === savedSlices.current[tab]) return
    if (current.blocked) return
    setAutoStatus("saving"); setAutoErr("")
    const t = setTimeout(async () => {
      try {
        await current.run()
        savedSlices.current[tab] = current.slice
        setAutoStatus("saved")
        setTimeout(() => setAutoStatus((s) => (s === "saved" ? "idle" : s)), 1800)
      } catch (e) {
        setAutoErr(e instanceof Error ? e.message : "Autosave failed")
        setAutoStatus("error")
      }
    }, 1400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.slice, current?.blocked, tab])

  // ---- Profile strength ----
  const skillsArr = f.skills.split(",").map((s) => s.trim()).filter(Boolean)
  const socialCount = [f.linkedin, f.github, f.twitter, f.facebook, f.instagram, f.website].filter(Boolean).length
  const strength = computeStrength({
    firstName: f.firstName, lastName: f.lastName, username: f.username,
    headline: f.headline, bio: f.bio, hasCover: !!f.coverUrl,
    houseId: f.houseId, batchId: f.batchId, city: f.city, phone: f.phone,
    industry: f.industry, company: f.company, designation: f.jobTitle,
    higherEducation: f.higherEducation, skills: skillsArr, socialCount,
  })

  // Confetti burst the moment the profile first hits 100%.
  const [confetti, setConfetti] = useState(false)
  const prevScore = useRef(strength.score)
  useEffect(() => {
    if (prevScore.current < 100 && strength.score >= 100) {
      setConfetti(true)
      const t = setTimeout(() => setConfetti(false), 2600)
      prevScore.current = strength.score
      return () => clearTimeout(t)
    }
    prevScore.current = strength.score
  }, [strength.score])

  const houseName = facets.houses.find((h) => h.id === f.houseId)?.name ?? ""
  const batchLabel = facets.batches.find((b) => b.id === f.batchId)?.label ?? ""
  const previewCard: AlumniCard = {
    id: f.username || "me",
    name: f.nickname?.trim() || `${f.firstName} ${f.lastName}`.trim() || "Your name",
    batch: batchLabel, batchLabel, batchAlt: batchLabel,
    house: houseName, company: f.company, achievement: "",
    image: f.photoUrl, location: f.city || undefined,
    membership: (f.membershipStatus as Membership) || "student",
    bio: f.headline || undefined, industry: f.industry || undefined,
  }

  function goTab(t: StrengthTab) { setTab(t); setNavOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }) }

  async function saveAccountNow() {
    await saveAccount({
      firstName: f.firstName, lastName: f.lastName, nickname: f.nickname, username: f.username,
      dateOfBirth: f.dateOfBirth || undefined, gender: f.gender || undefined, bio: f.bio, headline: f.headline,
      houseId: f.houseId || undefined, batchId: f.batchId || undefined, bloodGroup: f.bloodGroup || undefined, bloodDonor: f.bloodDonor,
    })
  }

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
            <Field label="Nickname" hint="optional"><input className={input} placeholder="Kaalu" value={f.nickname} onChange={(e) => set({ nickname: e.target.value })} /></Field>
            <Field label="Username">
              <input
                className={`${input} ${usernameState.status === "available" ? "!border-green-400" : usernameBlocksSave ? "!border-red-400" : ""}`}
                value={f.username}
                onChange={(e) => set({ username: e.target.value })}
              />
              {usernameState.status !== "idle" && (
                <p className={`mt-1 flex items-center gap-1 text-[11px] font-medium ${usernameState.status === "available" ? "text-green-600" : usernameState.status === "checking" ? "text-gray-400" : "text-red-600"}`}>
                  {usernameState.status === "checking" && <Loader2 className="h-3 w-3 animate-spin" />}
                  {usernameState.status === "available" && <Check className="h-3 w-3" />}
                  {usernameBlocksSave && <AlertCircle className="h-3 w-3" />}
                  {usernameState.status === "checking" ? "Checking availability…" : usernameState.msg}
                </p>
              )}
            </Field>
            <Field label="Birthday"><input type="date" className={input} value={f.dateOfBirth} onChange={(e) => set({ dateOfBirth: e.target.value })} /></Field>
            <Field label="Gender">
              <div className="flex gap-2">
                {["male", "female", "other"].map((g) => (
                  <button key={g} onClick={() => set({ gender: g })} className={`flex-1 rounded-[4px] border py-2 text-xs font-semibold capitalize transition-colors ${f.gender === g ? "border-brand bg-brand/10 text-brand" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>{g}</button>
                ))}
              </div>
            </Field>
          </div>
        </div>
        <div className="mt-4">
          <Field label="Headline" hint="shown on every card" full>
            <input className={input} maxLength={200} placeholder="Senior Product Manager · Fintech · JNV Nagpur ’15" value={f.headline} onChange={(e) => set({ headline: e.target.value })} />
            <p className="mt-1 text-[11px] text-gray-400">Your one-line tagline across the directory, community and profile.</p>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Overview" hint="optional" full>
            <textarea rows={2} maxLength={128} className={`${input} resize-none`} placeholder="A sentence about you…" value={f.bio} onChange={(e) => set({ bio: e.target.value })} />
            <p className="mt-1 text-[11px] text-gray-400">{128 - f.bio.length} characters left</p>
          </Field>
        </div>
        <div className="mt-4"><SaveBar onSave={saveAccountNow} onSaved={() => markSaved("account", tabSave.account.slice)} /></div>
      </Card>

      <Card title="Details That May Help Alumni" desc="JNV-specific details that help fellow Navodayans find and connect with you.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="House">
            {houseLocked ? (
              <div className="flex items-center gap-2">
                <span className="rounded-[4px] px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: facets.houses.find((h) => h.id === f.houseId)?.colorHex ?? "#6c757d" }}>{houseName || "—"}</span>
                <span className="flex items-center gap-1 text-[11px] text-gray-400"><Lock className="h-3 w-3" /> Locked</span>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {visibleHouses.map((h) => (
                    <button key={h.id} onClick={() => set({ houseId: f.houseId === h.id ? "" : h.id })} className={`rounded-[4px] px-3 py-1.5 text-xs font-semibold text-white transition-transform ${f.houseId === h.id ? "scale-105 ring-2 ring-gray-400 ring-offset-1" : "opacity-80 hover:opacity-100"}`} style={{ backgroundColor: h.colorHex }}>{h.name}</button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-gray-400">
                  {!f.batchId
                    ? "Pick your batch first — house options depend on your batch."
                    : "Options match your batch era and gender."}
                </p>
              </>
            )}
          </Field>
          <Field label="Batch">
            {batchLocked ? (
              <div className="flex items-center gap-2">
                <span className={`${input} inline-flex w-auto bg-gray-50`}>{batchLabel || "—"}</span>
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
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Blood Group">
            <div className="flex flex-wrap gap-2">
              {BLOOD.map((bg) => (
                <button key={bg} onClick={() => set({ bloodGroup: f.bloodGroup === bg ? "" : bg })} className={`h-9 min-w-[3rem] rounded-[4px] border text-sm font-bold transition-colors ${f.bloodGroup === bg ? "border-red-500 bg-red-500 text-white" : "border-red-300 bg-white text-red-500 hover:bg-red-50"}`}>{bg}</button>
              ))}
            </div>
          </Field>
          <Field label="Blood donor" hint="community">
            <Toggle on={f.bloodDonor} onChange={(v) => set({ bloodDonor: v })} label="Available as a blood donor" hint="Helps alumni find donors in emergencies." />
          </Field>
        </div>
        <div className="mt-4"><SaveBar onSave={saveAccountNow} onSaved={() => markSaved("account", tabSave.account.slice)} /></div>
      </Card>
    </div>
  )

  const ContactTab = (
    <Card title="Contact Details" desc="Keep your contact details updated for better networking.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Phone number"><input type="tel" className={input} placeholder="+91 98765 43210" value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
        <Field label="Primary Email"><input className={`${input} bg-gray-50`} value={f.email} readOnly /></Field>
        <Field label="Address" full><input className={input} placeholder="Street address" value={f.address} onChange={(e) => set({ address: e.target.value })} /></Field>
        <Field label="City">
          <input className={input} list="city-suggestions" value={f.city} onChange={(e) => set({ city: e.target.value })} />
          <datalist id="city-suggestions">
            {(facets.cities ?? []).map((c) => <option key={c} value={c} />)}
          </datalist>
        </Field>
        <Field label="Home Town"><input className={input} value={f.homeTown} onChange={(e) => set({ homeTown: e.target.value })} /></Field>
      </div>
      <div className="mt-3">
        <Toggle on={f.whatsappOptIn} onChange={(v) => set({ whatsappOptIn: v })} label="I'm reachable on WhatsApp at this number" hint="Only shown to verified alumni." />
      </div>
      <p className="mt-3 text-[11px] text-gray-400">Email changes aren&rsquo;t editable here yet.</p>
      <div className="mt-4"><SaveBar label="Update Contact" onSave={() => saveContact({ city: f.city, address: f.address, homeTown: f.homeTown, phone: f.phone, whatsappOptIn: f.whatsappOptIn })} onSaved={() => markSaved("contact", tabSave.contact.slice)} /></div>
    </Card>
  )

  const EducationTab = (
    <div className="space-y-4">
      <Card title="Profession & Education" desc="Your current role and academic background.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Current Company"><input className={input} placeholder="Company name" value={f.company} onChange={(e) => set({ company: e.target.value })} /></Field>
          <Field label="Designation / Job Title"><input className={input} placeholder="Your position" value={f.jobTitle} onChange={(e) => set({ jobTitle: e.target.value })} /></Field>
          <Field label="Industry" hint="shown on card">
            <input className={input} list="industry-suggestions" placeholder="e.g. Fintech, Healthcare" value={f.industry} onChange={(e) => set({ industry: e.target.value })} />
            <datalist id="industry-suggestions">
              {(facets.industries ?? []).map((ind) => <option key={ind.name} value={ind.name} />)}
            </datalist>
          </Field>
          <Field label="Department"><input className={input} placeholder="e.g. Engineering" value={f.department} onChange={(e) => set({ department: e.target.value })} /></Field>
          <Field label="Working since" hint="optional"><input type="date" className={input} value={f.workSince} onChange={(e) => set({ workSince: e.target.value })} /></Field>
          <Field label="Highest Education / Institution"><input className={input} placeholder="e.g. B.Tech, VNIT Nagpur" value={f.higherEducation} onChange={(e) => set({ higherEducation: e.target.value })} /></Field>
        </div>
        <div className="mt-4">
          <Field label="Key skills" hint="press Enter to add" full>
            <SkillsInput value={skillsArr} onChange={(arr) => set({ skills: arr.join(", ") })} />
          </Field>
        </div>
        <div className="mt-4"><SaveBar label="Save Details" onSave={() => saveProfessional({ company: f.company, jobTitle: f.jobTitle, industry: f.industry, department: f.department, workSince: f.workSince, higherEducation: f.higherEducation, skills: f.skills })} onSaved={() => markSaved("education", tabSave.education.slice)} /></div>
      </Card>

      <ExperienceEditor rows={experiences} onChanged={() => router.refresh()} />
      <EducationEditor rows={educations} onChanged={() => router.refresh()} />
    </div>
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
    <Card title="Social & Privacy" desc="Connect your profiles and control who can find you.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SOCIALS.map((s) => (
          <Field key={s.key} label={s.label}>
            <div className="flex overflow-hidden rounded-[4px] border border-gray-200 transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10">
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
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Toggle on={f.showOnMap} onChange={(v) => set({ showOnMap: v })} label="Show me on the alumni map" hint="Uses your city, never your exact address." />
        <Toggle on={f.isPublicIndexed} onChange={(v) => set({ isPublicIndexed: v })} label="Let search engines index my profile" hint="Only applies when profile is Public." />
      </div>
      <div className="mt-4"><SaveBar label="Update Social Profiles" onSave={() => saveSocial({ linkedin: f.linkedin, github: f.github, twitter: f.twitter, facebook: f.facebook, instagram: f.instagram, website: f.website, visibility: f.visibility, showOnMap: f.showOnMap, isPublicIndexed: f.isPublicIndexed })} onSaved={() => markSaved("social", tabSave.social.slice)} /></div>
    </Card>
  )

  const CloseTab = <CloseAccount />

  const SideNav = (
    <div className="overflow-hidden rounded-[4px] border border-gray-200 bg-white">
      <ul className="space-y-1 p-2">
        {TABS.map((t) => {
          const sectionDone = strength.items.filter((i) => i.tab === (t.key as StrengthTab))
          const allDone = t.key !== "close" && sectionDone.length > 0 && sectionDone.every((i) => i.done)
          return (
            <li key={t.key}>
              <button onClick={() => { setTab(t.key); setNavOpen(false) }} className={`flex w-full items-center gap-3 rounded-[4px] px-3 py-2.5 text-sm font-semibold transition-colors ${tab === t.key ? "bg-brand/10 text-brand" : "text-gray-600 hover:bg-gray-50"}`}>
                <t.icon className={`h-[18px] w-[18px] ${tab === t.key ? "text-brand" : "text-gray-400"}`} />
                <span className="flex-1 text-left">{t.label}</span>
                {allDone && <Check className="h-4 w-4 text-green-600" />}
              </button>
            </li>
          )
        })}
      </ul>
      <div className="border-t border-gray-100 py-2.5 text-center">
        <a href={`/${f.username}`} className="text-xs font-medium text-gray-500 hover:text-brand">View Profile</a>
      </div>
    </div>
  )

  const RightRail = (
    <div className="space-y-4">
      {/* Strength summary */}
      <div className="rounded-[4px] border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <StrengthRing score={strength.score} color={strength.tier.color} />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
              <Sparkles className="h-4 w-4 text-brand" /> Profile Strength
            </p>
            <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: strength.tier.color }}>{strength.tier.label}</span>
          </div>
        </div>
        {strength.next.length > 0 ? (
          <div className="mt-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Next best actions</p>
            <div className="space-y-1.5">
              {strength.next.slice(0, 3).map((it) => (
                <button key={it.key} onClick={() => goTab(it.tab)} className="flex w-full items-center gap-2 rounded-[4px] border border-gray-200 px-2.5 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:border-brand hover:bg-brand-50">
                  <span className="flex-1">{it.label}</span>
                  <span className="font-bold text-brand">+{it.points}%</span>
                  <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-[4px] bg-green-50 px-3 py-2 text-xs font-medium text-green-700">🎉 Your profile is complete. Nice work!</p>
        )}
      </div>

      {/* Live preview */}
      <div className="rounded-[4px] border border-gray-200 bg-white p-4">
        <p className="mb-1 text-sm font-bold text-gray-900">Live preview</p>
        <p className="mb-3 text-[11px] text-gray-400">How alumni see you.</p>
        <AlumniProfileCard alumni={previewCard} profileHref={`/${f.username}`} verified={f.membershipStatus !== "student"} actions={<span className="text-[11px] text-gray-400">Preview</span>} />
      </div>
    </div>
  )

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#f3f2ef] pb-6">
      {confetti && <Confetti />}
      <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 sm:py-6">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => setNavOpen(true)} className="flex items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-brand text-white"><SlidersHorizontal className="h-4 w-4" /></span>
            <span className="text-base font-bold text-gray-900">Settings</span>
          </button>
          <div className="ml-auto text-[11px] font-medium">
            {autoStatus === "saving" ? (
              <span className="flex items-center gap-1.5 text-gray-400"><Loader2 className="h-3 w-3 animate-spin" /> Saving…</span>
            ) : autoStatus === "saved" ? (
              <span className="flex items-center gap-1.5 text-green-600"><Check className="h-3 w-3" /> Saved</span>
            ) : autoStatus === "error" ? (
              <span className="flex items-center gap-1.5 text-red-600"><AlertCircle className="h-3 w-3" /> {autoErr || "Autosave failed"}</span>
            ) : dirty ? (
              <span className="flex items-center gap-1.5 text-amber-600"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes</span>
            ) : null}
          </div>
        </div>

        {/* Mobile strength banner */}
        <div className="mb-4 flex items-center gap-3 rounded-[4px] border border-gray-200 bg-white p-3 xl:hidden">
          <StrengthRing score={strength.score} color={strength.tier.color} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-bold text-gray-900"><Sparkles className="h-4 w-4 text-brand" /> {strength.tier.label}</p>
            {strength.next[0]
              ? <button onClick={() => goTab(strength.next[0].tab)} className="mt-1 text-xs font-medium text-brand">Next: {strength.next[0].label} +{strength.next[0].points}% →</button>
              : <p className="mt-1 text-xs font-medium text-green-700">Profile complete 🎉</p>}
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="hidden w-[240px] flex-shrink-0 lg:block"><div className="sticky top-[72px]">{SideNav}</div></div>
          <div className="min-w-0 flex-1">
            {tab === "account" && AccountTab}
            {tab === "contact" && ContactTab}
            {tab === "education" && EducationTab}
            {tab === "social" && SocialTab}
            {tab === "close" && CloseTab}
          </div>
          <div className="hidden w-[320px] flex-shrink-0 xl:block"><div className="sticky top-[72px]">{RightRail}</div></div>
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
    // Two-step guard so deletion is never a single click: (1) type "delete",
    // (2) give a reason. Only then is the destructive button enabled.
    const [typed, setTyped] = useState("")
    const [reason, setReason] = useState("")
    const [busy, setBusy] = useState(false)
    const step1Done = typed.trim().toLowerCase() === "delete"
    const canDelete = step1Done && reason.trim().length > 0
    async function del() {
      if (!canDelete) return
      setBusy(true)
      try { await closeAccount(reason.trim()); await signOut({ callbackUrl: "/" }) } catch { setBusy(false) }
    }
    return (
      <Card title="Delete account" desc="This action is permanent. Complete both steps to continue.">
        <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-gray-600">
          <li>Your profile is hidden from the directory and you&rsquo;ll be signed out.</li>
          <li>Posts, connections and karma are retained but no longer visible.</li>
          <li>Contact an admin within 30 days to restore your account.</li>
        </ul>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold text-gray-700">Step 1 — Type <span className="font-bold text-red-600">delete</span> to confirm</label>
          <input
            className={`${input} ${step1Done ? "border-green-400" : ""}`}
            placeholder="delete"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
          />
        </div>

        {step1Done && (
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">Step 2 — Why are you deleting your account?</label>
            <textarea
              rows={3}
              className={input}
              placeholder="Tell us what went wrong or why you're leaving…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        <button disabled={!canDelete || busy} onClick={del} className="mt-4 rounded-lg bg-red-500 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? "Deleting…" : "Delete my account"}
        </button>
      </Card>
    )
  }
}

/** Lightweight CSS confetti burst — no external deps (CSP blocks CDNs). Mounted
 *  only on the client the moment strength hits 100%, so Math.random is safe here. */
function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 44 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.35,
      duration: 1.8 + Math.random() * 1.1,
      rotate: Math.random() * 360,
      color: ["#009ae4", "#4CAF50", "#FFD700", "#e75480", "#ff9933", "#8FA9D9"][i % 6],
      size: 6 + Math.round(Math.random() * 6),
    })),
  )
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-[-16px] rounded-[2px]"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.6,
            background: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animation: `edit-confetti-fall ${p.duration}s linear ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  )
}

/** Token-chip skills editor. */
function SkillsInput({ value, onChange }: { value: string[]; onChange: (arr: string[]) => void }) {
  const [draft, setDraft] = useState("")
  function add(raw: string) {
    const s = raw.trim().replace(/,$/, "")
    if (s && !value.some((v) => v.toLowerCase() === s.toLowerCase())) onChange([...value, s])
    setDraft("")
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[4px] border border-gray-200 p-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10">
      {value.map((s) => (
        <span key={s} className="flex items-center gap-1.5 rounded-[4px] bg-brand-50 py-1 pl-2.5 pr-1.5 text-xs font-medium text-brand">
          {s}
          <button type="button" onClick={() => onChange(value.filter((v) => v !== s))} aria-label={`Remove ${s}`}><X className="h-3 w-3" /></button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(draft) } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1)) }}
        onBlur={() => add(draft)}
        placeholder={value.length ? "" : "SEO, Product Management, Design"}
        className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-sm outline-none"
      />
    </div>
  )
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
    <div className="relative overflow-hidden rounded-[4px] border border-gray-200">
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
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-[4px] bg-white/90 px-2 py-1 text-[11px] font-semibold text-gray-700 shadow-sm group-hover:bg-white">
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

// ─── Work experience & education editors ───────────────────────────────

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Self-employed", "Freelance", "Contract", "Internship", "Apprenticeship", "Seasonal"]
const LOCATION_TYPES = ["On-site", "Hybrid", "Remote"]
const THIS_YEAR = 2026
const YEARS = Array.from({ length: THIS_YEAR - 1959 }, (_, i) => THIS_YEAR - i)

function EmptyExp(): ExpRow {
  return { title: "", company: "", employmentType: "", location: "", locationType: "", current: true, startMonth: undefined, startYear: undefined, endMonth: undefined, endYear: undefined, description: "", skills: "" }
}
function EmptyEdu(): EduRow {
  return { school: "", degree: "", fieldOfStudy: "", startYear: undefined, endYear: undefined }
}

function expDates(e: ExpRow): string {
  const s = e.startYear ? `${MONTHS[(e.startMonth ?? 1) - 1].slice(0, 3)} ${e.startYear}` : ""
  const end = e.current ? "Present" : e.endYear ? `${MONTHS[(e.endMonth ?? 1) - 1].slice(0, 3)} ${e.endYear}` : ""
  return [s, end].filter(Boolean).join(" — ")
}

function ExperienceEditor({ rows, onChanged }: { rows: ExpRow[]; onChanged: () => void }) {
  const [editing, setEditing] = useState<ExpRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const upd = (patch: Partial<ExpRow>) => setEditing((p) => (p ? { ...p, ...patch } : p))

  async function save() {
    if (!editing) return
    setErr(""); setBusy(true)
    try {
      await saveExperience({ ...editing, startYear: editing.startYear ?? 0 })
      setEditing(null); onChanged()
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed") } finally { setBusy(false) }
  }
  async function remove(id?: string) {
    if (!id) return
    setBusy(true)
    try { await deleteExperience(id); onChanged() } finally { setBusy(false) }
  }

  return (
    <Card title="Work Experience" desc="Add every role you've held — as many as you like.">
      <div className="space-y-3">
        {rows.length === 0 && !editing && <p className="text-[13px] text-gray-500">No work experience added yet.</p>}
        {rows.map((e) => (
          <div key={e.id} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/60 p-3">
            <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-white text-gray-400 ring-1 ring-gray-200"><Briefcase className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-gray-900">{e.title}</div>
              <div className="text-[13px] text-gray-600">{e.company}{e.employmentType && <span className="text-gray-400"> · {e.employmentType}</span>}</div>
              <div className="text-xs text-gray-400">{expDates(e)}</div>
            </div>
            <div className="flex flex-shrink-0 gap-1">
              <button onClick={() => setEditing(e)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => remove(e.id)} disabled={busy} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {editing ? (
        <div className="mt-4 rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Job title *"><input className={input} placeholder="Senior Product Manager" value={editing.title} onChange={(e) => upd({ title: e.target.value })} /></Field>
            <Field label="Organization *"><input className={input} placeholder="Microsoft" value={editing.company} onChange={(e) => upd({ company: e.target.value })} /></Field>
            <Field label="Location"><input className={input} placeholder="City or region" value={editing.location} onChange={(e) => upd({ location: e.target.value })} /></Field>
            <Field label="Location type">
              <select className={input} value={editing.locationType} onChange={(e) => upd({ locationType: e.target.value })}>
                <option value="">Please select</option>
                {LOCATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Employment type">
              <select className={input} value={editing.employmentType} onChange={(e) => upd({ employmentType: e.target.value })}>
                <option value="">Please select</option>
                {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={editing.current} onChange={(e) => upd({ current: e.target.checked })} className="h-4 w-4 accent-brand" />
            <span className="text-sm text-gray-700">I currently work here</span>
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Start month">
              <select className={input} value={editing.startMonth ?? ""} onChange={(e) => upd({ startMonth: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">Month</option>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </Field>
            <Field label="Start year *">
              <select className={input} value={editing.startYear ?? ""} onChange={(e) => upd({ startYear: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">Year</option>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
            {!editing.current && <>
              <Field label="End month">
                <select className={input} value={editing.endMonth ?? ""} onChange={(e) => upd({ endMonth: e.target.value ? Number(e.target.value) : undefined })}>
                  <option value="">Month</option>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </Field>
              <Field label="End year">
                <select className={input} value={editing.endYear ?? ""} onChange={(e) => upd({ endYear: e.target.value ? Number(e.target.value) : undefined })}>
                  <option value="">Year</option>
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>
            </>}
          </div>
          <div className="mt-3">
            <Field label="Highlights" full><textarea rows={3} className={input} maxLength={2000} placeholder="Projects, problems you solved, or results you achieved" value={editing.description} onChange={(e) => upd({ description: e.target.value })} /></Field>
          </div>
          <div className="mt-3">
            <Field label="Skills (comma separated)" full><input className={input} placeholder="Leadership, SQL, Figma" value={editing.skills} onChange={(e) => upd({ skills: e.target.value })} /></Field>
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            {err && <span className="text-xs text-red-600">{err}</span>}
            <button onClick={() => { setEditing(null); setErr("") }} className="rounded-lg px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100">Cancel</button>
            <button onClick={save} disabled={busy} className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-600 disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditing(EmptyExp())} className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:border-brand hover:text-brand transition-colors">
          <Plus className="h-4 w-4" /> Add experience
        </button>
      )}
    </Card>
  )
}

function EducationEditor({ rows, onChanged }: { rows: EduRow[]; onChanged: () => void }) {
  const [editing, setEditing] = useState<EduRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const upd = (patch: Partial<EduRow>) => setEditing((p) => (p ? { ...p, ...patch } : p))

  async function save() {
    if (!editing) return
    setErr(""); setBusy(true)
    try { await saveEducation(editing); setEditing(null); onChanged() }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed") } finally { setBusy(false) }
  }
  async function remove(id?: string) {
    if (!id) return
    setBusy(true)
    try { await deleteEducation(id); onChanged() } finally { setBusy(false) }
  }

  return (
    <Card title="Education" desc="Add every school or college — as many as you like.">
      <div className="space-y-3">
        {rows.length === 0 && !editing && <p className="text-[13px] text-gray-500">No education added yet.</p>}
        {rows.map((e) => (
          <div key={e.id} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/60 p-3">
            <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-white text-gray-400 ring-1 ring-gray-200"><School className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-gray-900">{e.school}</div>
              {(e.degree || e.fieldOfStudy) && <div className="text-[13px] text-gray-600">{[e.degree, e.fieldOfStudy].filter(Boolean).join(", ")}</div>}
              {(e.startYear || e.endYear) && <div className="text-xs text-gray-400">{[e.startYear, e.endYear].filter(Boolean).join(" — ")}</div>}
            </div>
            <div className="flex flex-shrink-0 gap-1">
              <button onClick={() => setEditing(e)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => remove(e.id)} disabled={busy} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {editing ? (
        <div className="mt-4 rounded-lg border border-gray-200 p-4">
          <Field label="School *"><input className={input} placeholder="VNIT Nagpur" value={editing.school} onChange={(e) => upd({ school: e.target.value })} /></Field>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Degree"><input className={input} placeholder="Bachelor of Technology" value={editing.degree} onChange={(e) => upd({ degree: e.target.value })} /></Field>
            <Field label="Field of study"><input className={input} placeholder="Computer Science" value={editing.fieldOfStudy} onChange={(e) => upd({ fieldOfStudy: e.target.value })} /></Field>
            <Field label="Start year">
              <select className={input} value={editing.startYear ?? ""} onChange={(e) => upd({ startYear: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">Year</option>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
            <Field label="End year (or expected)">
              <select className={input} value={editing.endYear ?? ""} onChange={(e) => upd({ endYear: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">Year</option>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            {err && <span className="text-xs text-red-600">{err}</span>}
            <button onClick={() => { setEditing(null); setErr("") }} className="rounded-lg px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100">Cancel</button>
            <button onClick={save} disabled={busy} className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-600 disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditing(EmptyEdu())} className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:border-brand hover:text-brand transition-colors">
          <Plus className="h-4 w-4" /> Add education
        </button>
      )}
    </Card>
  )
}
