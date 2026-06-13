"use client"

import { useState, useRef } from "react"
import {
  UserCircle, Phone, GraduationCap, Share2, Trash2, Camera, Eye,
  RefreshCw, X, Plus, Globe, Link2, AtSign, MessageCircle, Menu,
  Home, Users, Calendar, SlidersHorizontal,
} from "lucide-react"

type TabKey = "account" | "contact" | "education" | "social" | "close"

const TABS: { key: TabKey; label: string; icon: typeof UserCircle }[] = [
  { key: "account", label: "Account", icon: UserCircle },
  { key: "contact", label: "Contact", icon: Phone },
  { key: "education", label: "Education & Profession", icon: GraduationCap },
  { key: "social", label: "Social Media Handles", icon: Share2 },
  { key: "close", label: "Close account", icon: Trash2 },
]

const HOUSES = [
  { value: "aravali", label: "Aravali", color: "#5a9bd5" },
  { value: "nilgiri", label: "Nilgiri", color: "#70ad47" },
  { value: "shiwalik", label: "Shiwalik", color: "#e8503a" },
  { value: "udaigiri", label: "Udaigiri", color: "#d4a017" },
  { value: "indira", label: "Indira", color: "#ff9933" },
  { value: "laxmi", label: "Laxmi", color: "#e75480" },
]
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
const BATCHES = Array.from({ length: 26 }, (_, i) => String(2025 - i))

/* ---------- Small shared field helpers ---------- */
function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-full" : ""}>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors"

function SaveBar({ label = "Save changes" }: { label?: string }) {
  const [saved, setSaved] = useState(false)
  return (
    <div className="flex justify-end">
      <button
        onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}
        className={`rounded-lg px-4 py-2 text-xs font-bold text-white transition-colors ${saved ? "bg-green-600" : "bg-brand hover:bg-brand-600"}`}
      >
        {saved ? "Saved ✓" : label}
      </button>
    </div>
  )
}

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      <div className="px-4 sm:px-5 pt-4">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
      <div className="px-4 sm:px-5 py-4">{children}</div>
    </div>
  )
}

/* ---------- Profile photo uploader ---------- */
function ProfilePhoto() {
  const [photo, setPhoto] = useState<string | null>("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face")
  const [menuOpen, setMenuOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setPhoto(URL.createObjectURL(f))
    setMenuOpen(false)
  }

  return (
    <div className="relative w-fit">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="group relative h-28 w-28 overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center"
      >
        {photo ? (
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <UserCircle className="h-12 w-12 text-gray-300" />
        )}
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="h-5 w-5" />
          <span className="text-[10px] font-semibold">Profile Photo</span>
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {menuOpen && (
        <div className="absolute left-0 top-full mt-1 z-20 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <button className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
            <Eye className="h-3.5 w-3.5" /> View Photo
          </button>
          <button onClick={() => inputRef.current?.click()} className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
            <RefreshCw className="h-3.5 w-3.5" /> Update Photo
          </button>
          <button onClick={() => { setPhoto(null); setMenuOpen(false) }} className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-red-500 hover:bg-red-50">
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      )}
    </div>
  )
}

/* ====================== TABS ====================== */

function AccountTab() {
  const [gender, setGender] = useState("male")
  const [house, setHouse] = useState("")
  const [blood, setBlood] = useState("")

  return (
    <div className="space-y-4">
      <Card title="Account Settings" desc="Update your basic profile information shown across the platform.">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Photo */}
          <div className="lg:col-span-1">
            <ProfilePhoto />
          </div>
          {/* Fields */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="First name"><input className={inputClass} defaultValue="Shubham" /></Field>
            <Field label="Last name"><input className={inputClass} defaultValue="Datarkar" /></Field>
            <Field label="Nickname (Optional)"><input className={inputClass} placeholder="Kaalu" /></Field>
            <Field label="Username"><input className={inputClass} defaultValue="@sndatarkar" /></Field>
            <Field label="Birthday"><input type="date" className={inputClass} defaultValue="1995-06-03" /></Field>
            <Field label="Gender">
              <div className="flex gap-2">
                {["male", "female", "other"].map(g => (
                  <button key={g} onClick={() => setGender(g)}
                    className={`flex-1 rounded-lg border py-2 text-xs font-semibold capitalize transition-colors ${gender === g ? "border-brand bg-brand/10 text-brand" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                    {g}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </div>

        <div className="mt-4">
          <Field label="Overview" full>
            <textarea rows={4} className={inputClass} defaultValue="Co-founder of The Grey Hawks & The Bogus Company, digital marketer, copywriter, and brand strategist." />
            <p className="text-[11px] text-gray-400 mt-1">Character limit: 128</p>
          </Field>
        </div>

        <div className="mt-4"><SaveBar /></div>
      </Card>

      <Card title="Details That May Help Alumni" desc="JNV-specific details that help fellow Navodayans find and connect with you.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="House">
            <div className="flex flex-wrap gap-2">
              {HOUSES.map(h => (
                <button key={h.value} onClick={() => setHouse(h.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-transform ${house === h.value ? "ring-2 ring-offset-1 ring-gray-400 scale-105" : "opacity-80 hover:opacity-100"}`}
                  style={{ backgroundColor: h.color }}>
                  {h.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Batch">
            <select className={inputClass}>
              <option value="">Select Batch</option>
              {BATCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Blood Group" full>
            <div className="flex flex-wrap gap-2">
              {BLOOD_GROUPS.map(bg => (
                <button key={bg} onClick={() => setBlood(bg)}
                  className={`h-9 min-w-[3rem] rounded-lg border text-sm font-bold transition-colors ${blood === bg ? "border-red-500 bg-red-500 text-white" : "border-red-300 bg-white text-red-500 hover:bg-red-50"}`}>
                  {bg}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <label className="flex items-start gap-2.5 mt-4 cursor-pointer">
          <input type="checkbox" defaultChecked className="mt-0.5 h-4 w-4 accent-brand" />
          <span className="text-xs text-gray-600">I am willing to donate or receive blood from NNAWCA members, their relatives, or friends.</span>
        </label>

        <div className="mt-4"><SaveBar /></div>
      </Card>
    </div>
  )
}

function ContactTab() {
  return (
    <Card title="Contact Details" desc="Keep your contact details updated for better networking.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Address Line 1"><input className={inputClass} placeholder="Street address" /></Field>
        <Field label="Address Line 2"><input className={inputClass} placeholder="Apartment, suite, etc." /></Field>
        <Field label="City"><input className={inputClass} /></Field>
        <Field label="State / Province"><input className={inputClass} /></Field>
        <Field label="Country">
          <select className={inputClass}>
            <option>Select country</option>
            <option>India</option>
            <option>United States</option>
            <option>United Kingdom</option>
          </select>
        </Field>
        <Field label="ZIP / Postal Code"><input className={inputClass} /></Field>
        <Field label="Primary Email"><input type="email" className={inputClass} placeholder="your.email@example.com" /></Field>
        <Field label="Secondary Email"><input type="email" className={inputClass} placeholder="alternate.email@example.com" /></Field>
      </div>

      <div className="mt-5 pt-4 border-t border-gray-100">
        <h3 className="text-sm font-bold text-gray-800 mb-3">Emergency Contact</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Name"><input className={inputClass} /></Field>
          <Field label="Relationship"><input className={inputClass} placeholder="Spouse, Parent, etc." /></Field>
          <Field label="Phone Number"><input type="tel" className={inputClass} /></Field>
        </div>
      </div>

      <div className="mt-4"><SaveBar label="Update Contact" /></div>
    </Card>
  )
}

function EducationTab() {
  const [sub, setSub] = useState<"education" | "professional">("education")
  return (
    <div className="space-y-4">
      <Card title="Current Professional Snapshot" desc="A quick overview of your current role.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Current Company"><input className={inputClass} placeholder="Company name" /></Field>
          <Field label="Job Title"><input className={inputClass} placeholder="Your position" /></Field>
          <Field label="Started in"><input className={inputClass} placeholder="Year or Month-Year" /></Field>
        </div>
      </Card>

      <Card title="Education, Qualifications & Career Details" desc="Your academic background, certifications, and professional history.">
        {/* Sub-tabs */}
        <div className="flex gap-1 mb-4 border-b border-gray-100">
          {(["education", "professional"] as const).map(s => (
            <button key={s} onClick={() => setSub(s)}
              className={`px-4 py-2 text-xs font-semibold border-b-2 -mb-px capitalize transition-colors ${sub === s ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {s}
            </button>
          ))}
        </div>

        {sub === "education" ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Highest Education">
                <select className={inputClass}>
                  <option value="">Select highest degree</option>
                  <option>High School</option>
                  <option>Bachelor&rsquo;s Degree</option>
                  <option>Master&rsquo;s Degree</option>
                  <option>Doctorate (PhD)</option>
                  <option>Professional Degree</option>
                </select>
              </Field>
              <Field label="Field of Study"><input className={inputClass} placeholder="e.g. Computer Science" /></Field>
              <Field label="University / Institution"><input className={inputClass} placeholder="Name of your university" /></Field>
              <Field label="Graduation Year">
                <select className={inputClass}>
                  <option value="">Select year</option>
                  {BATCHES.map(b => <option key={b}>{b}</option>)}
                </select>
              </Field>
            </div>
            <button className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add Another College
            </button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Job Title"><input className={inputClass} placeholder="e.g. Senior Marketing Manager" /></Field>
              <Field label="Company"><input className={inputClass} placeholder="e.g. The Grey Hawks" /></Field>
              <Field label="Location"><input className={inputClass} placeholder="e.g. Mumbai, India" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start Year">
                  <select className={inputClass}><option value="">Year</option>{BATCHES.map(b => <option key={b}>{b}</option>)}</select>
                </Field>
                <Field label="End Year">
                  <select className={inputClass}><option value="">Year</option><option>Present</option>{BATCHES.map(b => <option key={b}>{b}</option>)}</select>
                </Field>
              </div>
              <Field label="Professional Summary" full>
                <textarea rows={3} className={inputClass} placeholder="Brief summary of your experience and expertise" />
              </Field>
              <Field label="Key Skills" full>
                <input className={inputClass} placeholder="e.g. SEO, Project Management, Web Development" />
              </Field>
            </div>
            <button className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add Another Experience
            </button>
          </>
        )}

        <div className="mt-4"><SaveBar label="Save All Details" /></div>
      </Card>
    </div>
  )
}

function SocialTab() {
  const socials = [
    { label: "LinkedIn", color: "#0A66C2", icon: Link2, placeholder: "https://linkedin.com/in/yourprofile" },
    { label: "GitHub", color: "#181717", icon: Link2, placeholder: "https://github.com/username" },
    { label: "Twitter / X", color: "#1DA1F2", icon: AtSign, placeholder: "https://twitter.com/username" },
    { label: "Facebook", color: "#1877F2", icon: Share2, placeholder: "https://facebook.com/username" },
    { label: "Instagram", color: "#d6249f", icon: MessageCircle, placeholder: "https://instagram.com/username", gradient: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)" },
    { label: "Personal Website", color: "#0d6efd", icon: Globe, placeholder: "https://yourwebsite.com" },
  ]
  const [visibility, setVisibility] = useState("public")

  return (
    <Card title="Social Media & Online Presence" desc="Connect your social profiles to expand your network.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {socials.map(s => (
          <Field key={s.label} label={s.label}>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10 transition-colors">
              <span className="flex w-10 items-center justify-center text-white" style={{ background: s.gradient ?? s.color }}>
                <s.icon className="h-4 w-4" />
              </span>
              <input type="url" placeholder={s.placeholder} className="flex-1 px-3 py-2 text-sm outline-none" />
            </div>
          </Field>
        ))}
      </div>

      <div className="mt-5">
        <label className="block text-xs font-semibold text-gray-700 mb-2">Profile Visibility</label>
        <div className="space-y-2">
          {[
            { v: "public", label: "Public", sub: "Visible to all alumni and search engines" },
            { v: "alumni", label: "Alumni Only", sub: "Visible only to verified alumni" },
            { v: "private", label: "Private", sub: "Visible only to you" },
          ].map(o => (
            <label key={o.v} className="flex items-start gap-2.5 cursor-pointer">
              <input type="radio" name="visibility" checked={visibility === o.v} onChange={() => setVisibility(o.v)} className="mt-0.5 h-4 w-4 accent-brand" />
              <span className="text-sm text-gray-700"><span className="font-semibold">{o.label}</span> — {o.sub}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4"><SaveBar label="Update Social Profiles" /></div>
    </Card>
  )
}

function CloseTab() {
  const [confirm, setConfirm] = useState(false)
  const [modal, setModal] = useState(false)
  const [captcha] = useState("Kx7Qm9")
  const [input, setInput] = useState("")
  const [error, setError] = useState(false)

  function validate() {
    if (input === captcha) { setModal(false); alert("Account deletion confirmed (demo).") }
    else setError(true)
  }

  return (
    <Card title="Delete account" desc="This action is permanent. Please read the notes below before continuing.">
      <h3 className="text-sm font-bold text-gray-800">Before you go…</h3>
      <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside">
        <li>Take a backup of your data <a href="#" className="text-brand hover:underline">here</a>.</li>
        <li>If you delete your account, you will lose all your data permanently.</li>
      </ul>

      <label className="flex items-center gap-2.5 my-4 cursor-pointer">
        <input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} className="h-4 w-4 accent-red-500" />
        <span className="text-sm text-gray-700">Yes, I&rsquo;d like to delete my account</span>
      </label>

      <div className="flex flex-wrap gap-2">
        <button className="rounded-lg bg-green-50 px-4 py-2 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors">Keep my account</button>
        <button
          disabled={!confirm}
          onClick={() => setModal(true)}
          className="rounded-lg bg-red-500 px-4 py-2 text-xs font-bold text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Delete my account
        </button>
      </div>

      {/* Delete modal with CAPTCHA */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h4 className="text-base font-bold text-gray-900">Delete Account</h4>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600 mb-3">This action is permanent and cannot be undone. To confirm, enter the CAPTCHA shown below.</p>
              <div className="flex items-center gap-2 mb-3">
                <span className="select-none rounded-lg border border-gray-200 bg-gray-100 px-4 py-2 font-bold tracking-[0.3em] text-gray-700 line-through decoration-gray-300">{captcha}</span>
                <button className="rounded-lg border border-gray-200 px-2.5 py-2 text-gray-500 hover:bg-gray-50"><RefreshCw className="h-4 w-4" /></button>
              </div>
              <input
                value={input}
                onChange={e => { setInput(e.target.value); setError(false) }}
                placeholder="Enter CAPTCHA here"
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${error ? "border-red-400 focus:ring-2 focus:ring-red-100" : "border-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/10"}`}
              />
              {error && <p className="mt-1 text-xs text-red-500">CAPTCHA does not match.</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
              <button onClick={() => setModal(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={validate} className="rounded-lg bg-red-500 px-4 py-2 text-xs font-bold text-white hover:bg-red-600">Delete Account</button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

/* ====================== Page ====================== */
export default function EditProfilePage() {
  const [tab, setTab] = useState<TabKey>("account")
  const [navOpen, setNavOpen] = useState(false)

  const SideNav = (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <ul className="p-2 space-y-1">
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <li key={t.key}>
              <button
                onClick={() => { setTab(t.key); setNavOpen(false) }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${active ? "bg-brand/10 text-brand" : "text-gray-600 hover:bg-gray-50"}`}
              >
                <t.icon className={`h-4.5 w-4.5 ${active ? "text-brand" : "text-gray-400"}`} />
                {t.label}
              </button>
            </li>
          )
        })}
      </ul>
      <div className="border-t border-gray-100 py-2.5 text-center">
        <a href="/profile/shubham-datarkar" className="text-xs font-medium text-gray-500 hover:text-brand transition-colors">View Profile</a>
      </div>
    </div>
  )

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#f3f2ef] pb-16 lg:pb-6">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-4 sm:py-6">
        {/* Mobile settings toggle */}
        <button onClick={() => setNavOpen(true)} className="lg:hidden mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white"><SlidersHorizontal className="h-4 w-4" /></span>
          <span className="text-base font-bold text-gray-900">Settings</span>
        </button>

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Sidebar — desktop */}
          <div className="hidden lg:block w-[280px] flex-shrink-0">
            <div className="sticky top-[72px] space-y-4">
              {SideNav}
              <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
                {["About", "Settings", "Support", "Help", "Privacy & terms"].map(l => (
                  <li key={l}><a href="#" className="hover:text-brand transition-colors">{l}</a></li>
                ))}
              </ul>
              <p className="text-center text-[10px] text-gray-400">© 2026 NNAWCA · The Parliament</p>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {tab === "account" && <AccountTab />}
            {tab === "contact" && <ContactTab />}
            {tab === "education" && <EducationTab />}
            {tab === "social" && <SocialTab />}
            {tab === "close" && <CloseTab />}
          </div>
        </div>
      </div>

      {/* Mobile sidebar offcanvas */}
      {navOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setNavOpen(false)} />
          <div className="fixed top-0 left-0 z-50 h-full w-72 bg-[#f3f2ef] p-4 shadow-xl lg:hidden overflow-y-auto">
            <div className="flex justify-end mb-3">
              <button onClick={() => setNavOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            {SideNav}
          </div>
        </>
      )}

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 lg:hidden">
        <div className="flex items-center justify-around py-1.5">
          <a href="/feed" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Home className="h-5 w-5" /><span className="text-[10px] font-medium">Home</span></a>
          <a href="/connections" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Users className="h-5 w-5" /><span className="text-[10px] font-medium">Network</span></a>
          <a href="/compose" className="flex flex-col items-center px-3 py-1 -mt-3">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-brand to-brand-700 flex items-center justify-center shadow-md"><Plus className="h-5 w-5 text-white" /></div>
          </a>
          <a href="/events" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Calendar className="h-5 w-5" /><span className="text-[10px] font-medium">Events</span></a>
          <button onClick={() => setNavOpen(true)} className="flex flex-col items-center gap-0.5 text-gray-400 px-3 py-1"><Menu className="h-5 w-5" /><span className="text-[10px] font-medium">Menu</span></button>
        </div>
      </nav>
    </div>
  )
}
