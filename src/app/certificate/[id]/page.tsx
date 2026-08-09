import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Image as ImageIcon, FileText } from "lucide-react"
import { getCertificate } from "@/modules/contributions/service"
import { tierById, rupees } from "@/config/sponsor"
import { ACCENT_HEX } from "@/components/marketing/primitives"
import { PrintButton } from "./print-button"

export const dynamic = "force-dynamic"

const BRAND = "#009ae4"

// NNAWCA mark (matches the story image + opengraph-image.tsx).
function Mark({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="nm" x1="10.5" y1="12" x2="37.5" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EA4335" /><stop offset="0.55" stopColor="#FBBC05" /><stop offset="1" stopColor="#F9AB00" />
        </linearGradient>
      </defs>
      <rect x="6" y="8" width="9" height="32" rx="4.5" fill="#4285F4" />
      <rect x="33" y="8" width="9" height="32" rx="4.5" fill="#34A853" />
      <path d="M10.5 12 L37.5 36" stroke="url(#nm)" strokeWidth="9" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const cert = await getCertificate(id)
  return {
    title: cert ? `Certificate of Contribution — ${cert.name}` : "Certificate — NNAWCA",
    robots: { index: false }, // private link, don't index
  }
}

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cert = await getCertificate(id)
  if (!cert) notFound()

  const tier = tierById(cert.tier) ?? tierById("silver")!
  const hex = ACCENT_HEX[tier.accent]
  const date = cert.paidAt
    ? cert.paidAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : ""

  return (
    <div className="min-h-screen bg-[#f3f2ef] px-4 py-10 print:bg-white print:py-0">
      <div className="mx-auto max-w-4xl">
        {/* Certificate */}
        <div className="relative overflow-hidden rounded-[12px] bg-white shadow-[0_30px_80px_-30px_rgba(26,26,26,0.35)] print:shadow-none print:rounded-none">
          {/* left RGBY bar */}
          <div className="absolute inset-y-0 left-0 flex w-3 flex-col">
            <div className="flex-[30]" style={{ background: "#4285F4" }} />
            <div className="flex-[26]" style={{ background: "#EA4335" }} />
            <div className="flex-[24]" style={{ background: "#FBBC05" }} />
            <div className="flex-[20]" style={{ background: "#34A853" }} />
          </div>

          <div className="px-8 py-16 pl-12 text-center sm:px-20 sm:pl-24">
            {/* mark + wordmark */}
            <div className="flex items-center justify-center gap-3">
              <Mark size={38} />
              <span className="text-2xl font-extrabold tracking-[-0.01em] text-[#202124]">NNAWCA</span>
            </div>

            <h1 className="mt-10 font-heading text-4xl font-bold tracking-[-0.02em] text-[#202124] sm:text-5xl">
              Certificate of Appreciation
            </h1>

            <p className="mt-7 text-xs font-semibold uppercase tracking-[0.28em] text-[#7a7f87]">Presented to</p>
            <p className="mt-3 font-heading text-4xl font-extrabold tracking-[-0.02em] sm:text-6xl" style={{ color: BRAND }}>
              {cert.name}
            </p>

            <div className="mx-auto mt-6 h-px w-full max-w-lg bg-black/10" />

            <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-[#5f6368]">
              In recognition of a generous contribution of{" "}
              <span className="font-semibold text-[#202124]">{rupees(cert.amountPaise)}</span>{" "}
              to the NNAWCA alumni network — keeping it running for the whole Navodaya community.
            </p>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.22em]" style={{ color: hex }}>
              {tier.label} Supporter
            </p>

            {/* Footer row: date · seal · site */}
            <div className="mt-14 flex items-end justify-between gap-6">
              <div className="text-left">
                <p className="font-heading text-sm font-semibold text-[#202124]">{date}</p>
                <div className="mt-1 h-px w-28 bg-black/15 sm:w-40" />
                <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#9aa0a6]">Date</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-black/10 bg-white">
                  <Mark size={30} />
                </div>
                <div className="mt-1 flex h-2 w-12 overflow-hidden rounded-full">
                  <div className="flex-1" style={{ background: "#4285F4" }} />
                  <div className="flex-1" style={{ background: "#EA4335" }} />
                  <div className="flex-1" style={{ background: "#FBBC05" }} />
                  <div className="flex-1" style={{ background: "#34A853" }} />
                </div>
              </div>
              <div className="text-right">
                <p className="font-heading text-sm font-semibold text-[#202124]">nnawca.org</p>
                <div className="mt-1 ml-auto h-px w-28 bg-black/15 sm:w-40" />
                <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#9aa0a6]">JNV Nagpur</p>
              </div>
            </div>

            <p className="mt-10 text-[10px] uppercase tracking-[0.14em] text-[#c2c2c2]">Certificate ID {cert.id}</p>
          </div>
        </div>

        {/* Actions (hidden in print) */}
        <div className="no-print mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={`/certificate/${cert.id}/story.png`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[4px] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: hex }}
          >
            <ImageIcon className="h-4 w-4" /> Share image (story)
          </a>
          <a
            href={`/certificate/${cert.id}/certificate.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[4px] border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-[#1a1a1a] transition hover:border-black/25"
          >
            <FileText className="h-4 w-4" /> PDF
          </a>
          <PrintButton />
          <Link
            href="/development"
            className="inline-flex items-center rounded-[4px] border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-[#1a1a1a] transition hover:border-black/25"
          >
            See where it goes
          </Link>
        </div>
        <p className="no-print mt-3 text-center text-xs text-[#9a9a9a]">Keep this link — it&apos;s your certificate. Share the image on WhatsApp or Instagram.</p>
      </div>
    </div>
  )
}
