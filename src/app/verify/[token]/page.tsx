import Link from "next/link"
import type { Metadata } from "next"
import { verifyIdCardToken } from "@/lib/id-card-token"
import { loadIdCardData } from "@/modules/id-card/data"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Verify Alumni ID · NNAWCA",
  robots: { index: false, follow: false },
}

// Public scan-landing for the ID-card QR. No auth — a gatekeeper scans the card
// and sees a live VALID / INVALID verdict (BookMyShow model: the verdict is
// recomputed from the DB on every scan, so revocation/expiry is always current).

export default async function VerifyIdPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const payload = verifyIdCardToken(token)
  const data = payload ? await loadIdCardData(payload.u) : null

  const bad = !payload || !data
  const valid = !bad && data!.valid

  const accent = bad ? "#64748b" : valid ? "#16a34a" : "#dc2626"
  const heading = bad ? "Invalid card" : valid ? "Valid member" : "Not valid"
  const reason = bad ? "This QR code is not recognised or has been tampered with." : data!.validReason

  return (
    <div
      style={{ background: "#f3f2ef" }}
      className="min-h-dvh flex flex-col items-center justify-center px-4 py-10 font-[Poppins,sans-serif]"
    >
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-gray-200">
        {/* verdict banner */}
        <div className="flex flex-col items-center gap-2 px-6 py-8 text-white" style={{ background: accent }}>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            {valid ? (
              <svg viewBox="0 0 24 24" width={40} height={40} fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12l5 5L20 6" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width={40} height={40} fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            )}
          </div>
          <div className="text-2xl font-extrabold">{heading}</div>
          <div className="text-sm font-medium opacity-90">{reason}</div>
        </div>

        {/* member detail */}
        {!bad && (
          <div className="flex flex-col items-center gap-3 px-6 py-7">
            <div className="h-24 w-24 overflow-hidden rounded-2xl bg-gray-100 ring-2 ring-gray-200">
              {data!.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data!.photoUrl} alt={data!.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-extrabold text-white" style={{ background: accent }}>
                  {data!.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-xl font-extrabold text-gray-900">{data!.name}</div>
              <div className="text-sm font-semibold uppercase tracking-wide" style={{ color: accent }}>
                {data!.tierLabel}
              </div>
            </div>

            <dl className="mt-2 w-full divide-y divide-gray-100 text-sm">
              {[
                ["ID No.", data!.idNumber],
                ["Batch", data!.batch ?? "—"],
                ["House", data!.house ?? "—"],
                ["Valid thru", data!.validThru],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-semibold text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>

            {data!.username && (
              <Link
                href={`/${data!.username}`}
                className="mt-2 text-sm font-semibold text-brand hover:underline"
              >
                View profile →
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2 text-xs font-medium text-gray-400">
        <span className="h-2 w-2 rounded-full bg-brand" />
        NNAWCA · JNV Nagpur Alumni Network
      </div>
    </div>
  )
}
