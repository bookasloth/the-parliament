"use client"

import { useState, useRef } from "react"
import {
  ArrowLeft, Camera, Upload, Globe, Link2, AtSign,
  Plus, Trash2, CheckCircle, AlertCircle, Lock, Eye, EyeOff,
  ChevronRight, ChevronDown, Home, Users, Calendar, Menu, X, Save,
  Briefcase, GraduationCap, MapPin, Phone, Mail, Link as LinkIcon,
  Star, Hash, User,
} from "lucide-react"

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"]
const CURRENT_STATUSES = ["Working Professional", "Student", "Entrepreneur", "Researcher", "Retired", "Looking for opportunities"]
const HOUSES = ["Aravali", "Nilgiri", "Shiwalik", "Udaigiri", "Indira", "Laxmi"]
const HOUSE_COLORS: Record<string, string> = {
  Aravali: "#5a9bd5", Nilgiri: "#70ad47", Shiwalik: "#e8503a",
  Udaigiri: "#ffe135", Indira: "#ff9933", Laxmi: "#e75480",
}

const INTERESTS = [
  "Technology", "Sports", "Music", "Art", "Science", "Literature",
  "Entrepreneurship", "Education", "Healthcare", "Law", "Finance",
  "Agriculture", "Film", "Politics", "Social Work", "Research",
]

const BATCH_YEARS = Array.from({ length: 30 }, (_, i) => `${i + 1}th Batch (${1985 + i}–${1992 + i})`)

interface WorkEntry { company: string; role: string; from: string; to: string; current: boolean }

export default function EditProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [showPhotoMenu, setShowPhotoMenu] = useState(false)

  // Profile fields
  const [legalName, setLegalName] = useState("Shubham Datarkar")
  const [displayName, setDisplayName] = useState("Shubham")
  const [headline, setHeadline] = useState("Web Developer at TCS")
  const [bio, setBio] = useState("Navodayan. Developer. Building The Parliament for NNAWCA. Passionate about connecting JNV Nagpur alumni.")
  const [city, setCity] = useState("Nagpur, Maharashtra")
  const [phone, setPhone] = useState("+91 98765 43210")
  const [website, setWebsite] = useState("https://shubhamdatarkar.in")
  const [linkedin, setLinkedin] = useState("shubham-datarkar")
  const [twitter, setTwitter] = useState("shubham_dev")
  const [gender, setGender] = useState("Male")
  const [currentStatus, setCurrentStatus] = useState("Working Professional")
  const [house, setHouse] = useState("Udaigiri")
  const [batch, setBatch] = useState("21st Batch (2006–2013)")
  const [yearsStudied, setYearsStudied] = useState("7")
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["Technology", "Sports", "Entrepreneurship"])
  const [works, setWorks] = useState<WorkEntry[]>([
    { company: "Tata Consultancy Services", role: "Web Developer", from: "2020", to: "", current: true },
    { company: "Grey Hawks Media", role: "Co-founder", from: "2018", to: "2020", current: false },
  ])
  const [showPhone, setShowPhone] = useState(true)
  const [showEmail, setShowEmail] = useState(false)
  const bioRef = useRef<HTMLTextAreaElement>(null)

  const BIO_LIMIT = 300
  const toggleInterest = (i: string) => setSelectedInterests(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i])
  const toggleSection = (s: string) => setActiveSection(activeSection === s ? null : s)
  function handleSave() {
    setSaving(true)
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000) }, 1400)
  }

  const Section = ({ id, title, icon: Icon, children }: { id: string; title: string; icon: any; children: React.ReactNode }) => (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-brand-50 flex items-center justify-center">
            <Icon className="h-4 w-4 text-brand" />
          </div>
          <span className="text-sm font-semibold text-gray-900">{title}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${activeSection === id ? "rotate-180" : ""}`} />
      </button>
      {activeSection === id && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  )

  const InputRow = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )

  const inputCls = "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder:text-gray-400"

  return (
    <div className="min-h-screen bg-[#f3f2ef] pb-16 lg:pb-0">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className={`fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-xl transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex justify-end p-3 border-b"><button onClick={() => setSidebarOpen(false)}><X className="h-5 w-5 text-gray-400" /></button></div>
      </div>

      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[52px] max-w-[780px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100">
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
            <a href="/profile/shubham.datarkar" className="flex items-center gap-1.5 text-gray-500 hover:text-brand transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium hidden sm:inline">Back to Profile</span>
            </a>
            <span className="text-sm font-semibold text-gray-900">Edit Profile</span>
          </div>
          <div className="flex items-center gap-2">
            {saved && <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="h-3.5 w-3.5" /> Saved</span>}
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-60">
              {saving ? <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[780px] px-4 sm:px-6 py-6 space-y-4">
        {/* Cover + Avatar */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Cover Photo */}
          <div className="relative h-32 sm:h-44 bg-gradient-to-r from-brand to-brand-700 group">
            <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-black/30">
              <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-gray-700">
                <Camera className="h-4 w-4" /> Change Cover
              </div>
              <input type="file" accept="image/*" className="sr-only" />
            </label>
            <div className="absolute top-3 right-3">
              <label className="flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white cursor-pointer hover:bg-black/60 transition-colors">
                <Upload className="h-3 w-3" /> Upload Cover
                <input type="file" accept="image/*" className="sr-only" />
              </label>
            </div>
          </div>

          {/* Avatar */}
          <div className="px-5 pb-5">
            <div className="flex items-end justify-between -mt-10 mb-4">
              <div className="relative">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face"
                  alt="" className="h-20 w-20 rounded-full object-cover border-4 border-white shadow-md" />
                <button
                  onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                  className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-brand text-white flex items-center justify-center shadow-md hover:bg-brand-600 transition-colors"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                {showPhotoMenu && (
                  <div className="absolute top-full left-0 mt-1 z-20 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    <label className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer">
                      <Upload className="h-4 w-4" /> Upload Photo
                      <input type="file" accept="image/*" className="sr-only" />
                    </label>
                    <button className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-gray-50 w-full">
                      <Trash2 className="h-4 w-4" /> Remove Photo
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                <span>Completion: <strong className="text-gray-700">72%</strong></span>
              </div>
            </div>

            {/* Quick editable name + headline */}
            <div className="space-y-2">
              <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                className={inputCls + " text-base font-semibold"} placeholder="Display Name" />
              <input value={headline} onChange={e => setHeadline(e.target.value)}
                className={inputCls} placeholder="Professional headline…" />
            </div>
          </div>
        </div>

        {/* Sections (accordion) */}
        <Section id="basic" title="Basic Information" icon={User}>
          <InputRow label="Legal Full Name" required>
            <input value={legalName} onChange={e => setLegalName(e.target.value)} className={inputCls} />
            <p className="mt-1 text-[11px] text-gray-400">Must match government ID. Used for verification only, not shown publicly.</p>
          </InputRow>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputRow label="Gender">
              <select value={gender} onChange={e => setGender(e.target.value)} className={inputCls + " appearance-none"}>
                {GENDERS.map(g => <option key={g}>{g}</option>)}
              </select>
            </InputRow>
            <InputRow label="Current Status">
              <select value={currentStatus} onChange={e => setCurrentStatus(e.target.value)} className={inputCls + " appearance-none"}>
                {CURRENT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </InputRow>
          </div>
          <InputRow label="Bio">
            <div className="relative">
              <textarea ref={bioRef} value={bio} onChange={e => setBio(e.target.value.slice(0, BIO_LIMIT))}
                rows={3} className={inputCls + " resize-none"} placeholder="Tell the community about yourself…" />
              <span className={`absolute bottom-2 right-3 text-[10px] tabular-nums ${bio.length > BIO_LIMIT - 30 ? "text-red-400" : "text-gray-400"}`}>
                {BIO_LIMIT - bio.length}
              </span>
            </div>
          </InputRow>
        </Section>

        <Section id="contact" title="Contact & Location" icon={MapPin}>
          <InputRow label="City / Location">
            <input value={city} onChange={e => setCity(e.target.value)} className={inputCls} placeholder="Nagpur, Maharashtra" />
          </InputRow>
          <InputRow label="Phone Number">
            <div className="flex gap-2">
              <input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} placeholder="+91 XXXXX XXXXX" />
              <button onClick={() => setShowPhone(!showPhone)}
                className="flex-shrink-0 p-2.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                title={showPhone ? "Visible to connections" : "Hidden"}>
                {showPhone ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-gray-400">{showPhone ? "Visible to your connections" : "Hidden from other members"}</p>
          </InputRow>
          <InputRow label="Website">
            <input value={website} onChange={e => setWebsite(e.target.value)} className={inputCls} placeholder="https://yourwebsite.com" />
          </InputRow>
        </Section>

        <Section id="jnv" title="JNV Details" icon={GraduationCap}>
          <InputRow label="House">
            <div className="grid grid-cols-3 gap-2">
              {HOUSES.map(h => (
                <button key={h} onClick={() => setHouse(h)}
                  className={`rounded-lg border-2 py-2.5 text-xs font-semibold transition-all ${house === h ? "border-current text-white shadow-sm" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                  style={house === h ? { backgroundColor: HOUSE_COLORS[h], borderColor: HOUSE_COLORS[h] } : {}}>
                  {h}
                </button>
              ))}
            </div>
          </InputRow>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputRow label="Batch">
              <select value={batch} onChange={e => setBatch(e.target.value)} className={inputCls + " appearance-none"}>
                {BATCH_YEARS.map(b => <option key={b}>{b}</option>)}
              </select>
            </InputRow>
            <InputRow label="Years Studied">
              <select value={yearsStudied} onChange={e => setYearsStudied(e.target.value)} className={inputCls + " appearance-none"}>
                {["1", "2", "3", "4", "5", "6", "7"].map(y => <option key={y}>{y} year{y !== "1" ? "s" : ""}</option>)}
              </select>
            </InputRow>
          </div>
        </Section>

        <Section id="work" title="Work Experience" icon={Briefcase}>
          {works.map((w, i) => (
            <div key={i} className="rounded-lg border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Entry {i + 1}</p>
                <button onClick={() => setWorks(works.filter((_, j) => j !== i))} className="p-1 text-gray-300 hover:text-red-400 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <input value={w.company} onChange={e => { const n = [...works]; n[i].company = e.target.value; setWorks(n) }}
                className={inputCls} placeholder="Company / Organisation" />
              <input value={w.role} onChange={e => { const n = [...works]; n[i].role = e.target.value; setWorks(n) }}
                className={inputCls} placeholder="Role / Designation" />
              <div className="grid grid-cols-2 gap-3">
                <input value={w.from} onChange={e => { const n = [...works]; n[i].from = e.target.value; setWorks(n) }}
                  className={inputCls} placeholder="From (year)" />
                <input value={w.to} disabled={w.current} onChange={e => { const n = [...works]; n[i].to = e.target.value; setWorks(n) }}
                  className={inputCls + " disabled:bg-gray-50 disabled:text-gray-400"} placeholder="To (year)" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={w.current} onChange={e => { const n = [...works]; n[i].current = e.target.checked; setWorks(n) }}
                  className="h-4 w-4 rounded border-gray-300 accent-brand" />
                <span className="text-sm text-gray-600">Currently working here</span>
              </label>
            </div>
          ))}
          <button onClick={() => setWorks([...works, { company: "", role: "", from: "", to: "", current: false }])}
            className="flex items-center gap-2 text-sm font-medium text-brand hover:text-brand-600 transition-colors">
            <Plus className="h-4 w-4" /> Add Work Experience
          </button>
        </Section>

        <Section id="interests" title="Interests" icon={Hash}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {INTERESTS.map(interest => (
              <button key={interest} onClick={() => toggleInterest(interest)}
                className={`rounded-lg border-2 py-2 text-xs font-medium transition-all text-left px-3 ${selectedInterests.includes(interest) ? "border-brand bg-brand-50 text-brand" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                {selectedInterests.includes(interest) && "✓ "}{interest}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">{selectedInterests.length} selected</p>
        </Section>

        <Section id="social" title="Social Links" icon={LinkIcon}>
          {[
            { icon: Link2, label: "LinkedIn", value: linkedin, set: setLinkedin, placeholder: "linkedin.com/in/username", prefix: "linkedin.com/in/" },
            { icon: AtSign, label: "Twitter / X", value: twitter, set: setTwitter, placeholder: "x.com/username", prefix: "@" },
            { icon: Globe, label: "Website", value: website, set: setWebsite, placeholder: "https://yoursite.com", prefix: "" },
          ].map(({ icon: Icon, label, value, set, placeholder }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-gray-400" />
              </div>
              <input value={value} onChange={e => set(e.target.value)}
                className={inputCls} placeholder={placeholder} />
            </div>
          ))}
        </Section>

        <Section id="privacy" title="Privacy Settings" icon={Lock}>
          {[
            { label: "Show phone to connections", state: showPhone, set: setShowPhone },
            { label: "Show email publicly", state: showEmail, set: setShowEmail },
          ].map(({ label, state, set }) => (
            <label key={label} className="flex items-center justify-between cursor-pointer py-1">
              <span className="text-sm text-gray-700">{label}</span>
              <div onClick={() => set(!state)}
                className={`relative h-5 w-9 rounded-full transition-colors flex-shrink-0 ${state ? "bg-brand" : "bg-gray-200"}`}>
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${state ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
            </label>
          ))}
        </Section>

        {/* Save Button */}
        <button onClick={handleSave} disabled={saving}
          className="w-full rounded-xl bg-brand py-3.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-md">
          {saving ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          {saving ? "Saving Profile…" : "Save All Changes"}
        </button>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 lg:hidden">
        <div className="flex items-center justify-around py-1.5">
          <a href="/feed" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Home className="h-5 w-5" /><span className="text-[10px] font-medium">Home</span></a>
          <a href="/connections" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Users className="h-5 w-5" /><span className="text-[10px] font-medium">Network</span></a>
          <span className="flex flex-col items-center px-3 py-1 -mt-3">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-brand to-brand-700 flex items-center justify-center shadow-md"><Plus className="h-5 w-5 text-white" /></div>
          </span>
          <a href="/events" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Calendar className="h-5 w-5" /><span className="text-[10px] font-medium">Events</span></a>
          <button onClick={() => setSidebarOpen(true)} className="flex flex-col items-center gap-0.5 text-gray-400 px-3 py-1"><Menu className="h-5 w-5" /><span className="text-[10px] font-medium">Menu</span></button>
        </div>
      </nav>
    </div>
  )
}
