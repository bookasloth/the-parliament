"use client"

import { FormEvent, useState } from "react"
import { createBusinessAction } from "./actions"

export function NewBusinessForm({ categories }: { categories: { id: string; label: string }[] }) {
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    const f = new FormData(e.currentTarget)
    try {
      await createBusinessAction({
        name: String(f.get("name") ?? ""),
        categoryId: String(f.get("categoryId") ?? ""),
        description: String(f.get("description") ?? ""),
        website: String(f.get("website") ?? ""),
        city: String(f.get("city") ?? ""),
        contactEmail: String(f.get("contactEmail") ?? ""),
        contactPhone: String(f.get("contactPhone") ?? ""),
        offersAlumniDiscount: f.get("offersAlumniDiscount") === "on",
      })
      // action redirects on success
    } catch (err) {
      setSubmitting(false)
      setError(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  const input = "mt-1 w-full rounded-[3px] border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="rounded-[3px] bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      <div>
        <label className="text-sm font-medium">Business name *</label>
        <input name="name" required className={input} />
      </div>
      <div>
        <label className="text-sm font-medium">Category *</label>
        <select name="categoryId" required defaultValue="" className={input}>
          <option value="" disabled>Select a category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <textarea name="description" rows={4} className={input} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">City</label>
          <input name="city" className={input} />
        </div>
        <div>
          <label className="text-sm font-medium">Website</label>
          <input name="website" type="url" placeholder="https://" className={input} />
        </div>
        <div>
          <label className="text-sm font-medium">Contact email</label>
          <input name="contactEmail" type="email" className={input} />
        </div>
        <div>
          <label className="text-sm font-medium">Contact phone</label>
          <input name="contactPhone" className={input} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" name="offersAlumniDiscount" className="h-4 w-4" />
        Offer a discount to fellow alumni
      </label>
      <button type="submit" disabled={submitting}
        className="w-full rounded-[3px] bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50">
        {submitting ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  )
}
