"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { updateBusinessAction } from "../actions"
import { EMPLOYEE_SIZES } from "@/modules/business/service"
import { BusinessImageUploader } from "./business-image-uploader"

const SOCIALS = ["linkedin", "twitter", "instagram", "facebook", "youtube", "github"] as const

export interface EditInitial {
  name: string
  categoryId: string
  description: string
  tagline: string
  industry: string
  foundedYear: string
  employeeSize: string
  headquarters: string
  city: string
  website: string
  contactEmail: string
  contactPhone: string
  offersAlumniDiscount: boolean
  socials: Record<string, string>
  logoUrl: string | null
  bannerUrl: string | null
}

export function EditBusinessForm({
  slug,
  categories,
  initial,
}: {
  slug: string
  categories: { id: string; label: string }[]
  initial: EditInitial
}) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  // undefined = keep existing image, null = remove, string = new R2 key.
  const [logoKey, setLogoKey] = useState<string | null | undefined>(undefined)
  const [bannerKey, setBannerKey] = useState<string | null | undefined>(undefined)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const f = new FormData(e.currentTarget)
    const socialLinks: Record<string, string> = {}
    for (const k of SOCIALS) {
      const v = String(f.get(`social_${k}`) ?? "").trim()
      if (v) socialLinks[k] = v
    }
    try {
      const r = await updateBusinessAction(slug, {
        name: String(f.get("name") ?? ""),
        categoryId: String(f.get("categoryId") ?? ""),
        description: String(f.get("description") ?? ""),
        tagline: String(f.get("tagline") ?? ""),
        industry: String(f.get("industry") ?? ""),
        foundedYear: String(f.get("foundedYear") ?? ""),
        employeeSize: String(f.get("employeeSize") ?? ""),
        headquarters: String(f.get("headquarters") ?? ""),
        city: String(f.get("city") ?? ""),
        website: String(f.get("website") ?? ""),
        contactEmail: String(f.get("contactEmail") ?? ""),
        contactPhone: String(f.get("contactPhone") ?? ""),
        offersAlumniDiscount: f.get("offersAlumniDiscount") === "on",
        socialLinks,
        logoKey,
        bannerKey,
      })
      if (r.ok) {
        router.push(`/business/${r.slug}`)
        router.refresh()
      } else {
        setError(r.error ?? "Something went wrong")
        setSaving(false)
      }
    } catch {
      setError("Something went wrong")
      setSaving(false)
    }
  }

  const input = "mt-1 w-full rounded-[3px] border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
  const label = "text-sm font-medium text-gray-700"

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <p className="rounded-[3px] bg-red-50 p-2 text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <BusinessImageUploader label="Logo" shape="square" initialUrl={initial.logoUrl} onChange={setLogoKey} />
        <BusinessImageUploader label="Cover banner" shape="wide" initialUrl={initial.bannerUrl} onChange={setBannerKey} />
      </div>

      <div>
        <label className={label}>Business name *</label>
        <input name="name" required defaultValue={initial.name} className={input} />
      </div>
      <div>
        <label className={label}>Category *</label>
        <select name="categoryId" required defaultValue={initial.categoryId} className={input}>
          <option value="" disabled>Select a category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
      <div>
        <label className={label}>Tagline</label>
        <input name="tagline" maxLength={160} defaultValue={initial.tagline} placeholder="One line about your company" className={input} />
      </div>
      <div>
        <label className={label}>Description</label>
        <textarea name="description" rows={4} defaultValue={initial.description} className={input} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Industry</label>
          <input name="industry" maxLength={80} defaultValue={initial.industry} placeholder="e.g. Software, Retail" className={input} />
        </div>
        <div>
          <label className={label}>Company size</label>
          <select name="employeeSize" defaultValue={initial.employeeSize} className={input}>
            <option value="">Not specified</option>
            {EMPLOYEE_SIZES.map((s) => <option key={s} value={s}>{s} employees</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Founded (year)</label>
          <input name="foundedYear" inputMode="numeric" defaultValue={initial.foundedYear} placeholder="e.g. 2015" className={input} />
        </div>
        <div>
          <label className={label}>Headquarters</label>
          <input name="headquarters" maxLength={160} defaultValue={initial.headquarters} placeholder="City, Country" className={input} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>City</label>
          <input name="city" defaultValue={initial.city} className={input} />
        </div>
        <div>
          <label className={label}>Website</label>
          <input name="website" type="url" defaultValue={initial.website} placeholder="https://" className={input} />
        </div>
        <div>
          <label className={label}>Contact email</label>
          <input name="contactEmail" type="email" defaultValue={initial.contactEmail} className={input} />
        </div>
        <div>
          <label className={label}>Contact phone</label>
          <input name="contactPhone" defaultValue={initial.contactPhone} className={input} />
        </div>
      </div>

      <fieldset className="rounded-[4px] border border-gray-200 p-4">
        <legend className="px-1 text-sm font-semibold text-gray-700">Social links</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {SOCIALS.map((k) => (
            <div key={k}>
              <label className="text-xs font-medium capitalize text-gray-500">{k}</label>
              <input name={`social_${k}`} type="url" defaultValue={initial.socials[k] ?? ""} placeholder="https://" className={input} />
            </div>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" name="offersAlumniDiscount" defaultChecked={initial.offersAlumniDiscount} className="h-4 w-4" />
        Offer a discount to fellow alumni
      </label>

      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="rounded-[3px] bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50">
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button type="button" onClick={() => router.push(`/business/${slug}`)}
          className="rounded-[3px] border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  )
}
