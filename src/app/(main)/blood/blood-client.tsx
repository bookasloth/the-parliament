"use client"

import { useState } from "react"
import { Droplet, X, Users, Send, CheckCircle2, AlertCircle } from "lucide-react"
import { previewBloodAudienceAction, createBloodRequestAction } from "./actions"

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const

export interface BloodPrefill {
  name: string
  city: string
  contact: string
  myGroup: string
}

const field =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"

export default function BloodClient({ prefill }: { prefill: BloodPrefill }) {
  const [openGroup, setOpenGroup] = useState<string | null>(null)

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Droplet className="h-6 w-6 fill-red-500 text-red-500" /> Blood Requests
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Raise an urgent request. We WhatsApp alumni whose blood group can donate to the patient — nearest city first.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {BLOOD_GROUPS.map((g) => (
          <button
            key={g}
            onClick={() => setOpenGroup(g)}
            className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-6 transition hover:border-red-300 hover:shadow-sm"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-lg font-bold text-red-600 group-hover:bg-red-100">
              {g}
            </span>
            <span className="text-xs font-medium text-gray-500">
              {g === prefill.myGroup ? "Your group" : "Request"}
            </span>
          </button>
        ))}
      </div>

      {openGroup && (
        <RequestModal group={openGroup} prefill={prefill} onClose={() => setOpenGroup(null)} />
      )}
    </div>
  )
}

function RequestModal({
  group,
  prefill,
  onClose,
}: {
  group: string
  prefill: BloodPrefill
  onClose: () => void
}) {
  const [patient, setPatient] = useState("")
  const [city, setCity] = useState(prefill.city)
  const [hospital, setHospital] = useState("")
  const [contact, setContact] = useState(prefill.contact)
  const [units, setUnits] = useState("")
  const [allCities, setAllCities] = useState(false)
  const [donorsOnly, setDonorsOnly] = useState(false)

  const [reach, setReach] = useState<number | null>(null)
  const [checking, setChecking] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ sent: number; recipientCount: number; failed: number; skipped: boolean } | null>(null)

  const previewInput = { bloodGroup: group, city, allCities, donorsOnly }

  async function preview() {
    setChecking(true)
    setError(null)
    try {
      setReach(await previewBloodAudienceAction(previewInput))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed")
    } finally {
      setChecking(false)
    }
  }

  async function submit() {
    setError(null)
    if (!patient.trim() || !city.trim() || !hospital.trim() || !contact.trim()) {
      setError("Fill patient, city, hospital and contact.")
      return
    }
    setSending(true)
    try {
      const r = await createBloodRequestAction({
        bloodGroup: group,
        patient,
        city,
        hospital,
        contact,
        unitsNeeded: units ? Number(units) : null,
        allCities,
        donorsOnly,
      })
      setDone(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send request")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-sm font-bold text-red-600">
              {group}
            </span>
            Blood request
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            {done.skipped ? (
              <div>
                <p className="font-semibold text-gray-900">Request recorded</p>
                <p className="text-sm text-gray-600">
                  WhatsApp isn’t live yet — {done.recipientCount} matching donors found but none messaged. An admin will
                  enable sending.
                </p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-gray-900">Request sent</p>
                <p className="text-sm text-gray-600">
                  Messaged <b className="text-gray-900">{done.sent}</b> of {done.recipientCount} matching donors
                  {done.failed ? `, ${done.failed} failed` : ""}. Donors can call your contact directly.
                </p>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Labeled label="Patient / for whom">
              <input value={patient} onChange={(e) => setPatient(e.target.value)} placeholder="e.g. My uncle" className={field} />
            </Labeled>
            <div className="grid grid-cols-2 gap-3">
              <Labeled label="City">
                <input value={city} onChange={(e) => { setCity(e.target.value); setReach(null) }} className={field} />
              </Labeled>
              <Labeled label="Units (optional)">
                <input value={units} onChange={(e) => setUnits(e.target.value)} inputMode="numeric" className={field} />
              </Labeled>
            </div>
            <Labeled label="Hospital">
              <input value={hospital} onChange={(e) => setHospital(e.target.value)} placeholder="e.g. GMC Hospital" className={field} />
            </Labeled>
            <Labeled label="Contact number (shown to donors)">
              <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+91…" className={field} />
            </Labeled>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={allCities} onChange={(e) => { setAllCities(e.target.checked); setReach(null) }} />
              Notify donors in all cities (not just {city || "this city"})
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={donorsOnly} onChange={(e) => { setDonorsOnly(e.target.checked); setReach(null) }} />
              Only members who marked themselves as donors
            </label>

            {error && (
              <p className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={preview}
                disabled={checking}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Users className="h-4 w-4" /> {checking ? "Checking…" : "Preview reach"}
              </button>
              {reach !== null && (
                <span className="text-sm text-gray-600">
                  <b className="text-gray-900">{reach}</b> reachable donor{reach === 1 ? "" : "s"}
                </span>
              )}
              <button
                onClick={submit}
                disabled={sending}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> {sending ? "Sending…" : "Send request"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  )
}
