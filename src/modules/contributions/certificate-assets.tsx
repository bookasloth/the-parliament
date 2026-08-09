import { ImageResponse } from "next/og"
import sharp from "sharp"
import { tierById } from "@/config/sponsor"
import type { Certificate } from "./service"

// RGBY deck (kept local — don't import the "use client" primitives into server code).
const ACCENT_HEX = ["#009ae4", "#e8503a", "#d4a800", "#70ad47"] as const
const STORY = { width: 1080, height: 1920 }

// NNAWCA mark as an SVG data URI (satori renders it as <img>). Mirrors opengraph-image.tsx.
const MARK = `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="d" x1="10.5" y1="12" x2="37.5" y2="36" gradientUnits="userSpaceOnUse"><stop stop-color="#EA4335"/><stop offset="0.55" stop-color="#FBBC05"/><stop offset="1" stop-color="#F9AB00"/></linearGradient></defs><rect x="6" y="8" width="9" height="32" rx="4.5" fill="#4285F4"/><rect x="33" y="8" width="9" height="32" rx="4.5" fill="#34A853"/><path d="M10.5 12 L37.5 36" stroke="url(#d)" stroke-width="9" stroke-linecap="round" fill="none"/></svg>`
const MARK_URI = `data:image/svg+xml,${encodeURIComponent(MARK)}`

const rupeesPlain = (paise: number) => `Rs ${(paise / 100).toLocaleString("en-IN")}`

function fmtDate(d: Date | null): string {
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : ""
}

/**
 * 1080×1920 Instagram-story / WhatsApp-status certificate. Google-"Certificate
 * of Appreciation" aesthetic: light, left RGBY bar, centered mark, blue name.
 * Satori rules: every multi-child div sets display:flex; no glyphs that need a
 * downloadable font (no ★, no ₹ — use ASCII "Rs").
 */
export function storyImageResponse(cert: Certificate): ImageResponse {
  const tier = tierById(cert.tier) ?? tierById("silver")!
  const BRAND = "#009ae4"

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#ffffff", fontFamily: "sans-serif" }}>
        {/* left RGBY bar */}
        <div style={{ display: "flex", flexDirection: "column", width: 30, height: "100%" }}>
          <div style={{ display: "flex", flex: 30, background: "#4285F4" }} />
          <div style={{ display: "flex", flex: 26, background: "#EA4335" }} />
          <div style={{ display: "flex", flex: 24, background: "#FBBC05" }} />
          <div style={{ display: "flex", flex: 20, background: "#34A853" }} />
        </div>

        {/* content */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", flex: 1, padding: "150px 90px" }}>
          {/* logo */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={MARK_URI} width={92} height={92} alt="" />
              <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: "-0.02em", color: "#202124", marginLeft: 22 }}>NNAWCA</div>
            </div>
          </div>

          {/* title + presentee */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 78, fontWeight: 800, color: "#202124", letterSpacing: "-0.02em", textAlign: "center" }}>
              Certificate of
            </div>
            <div style={{ display: "flex", fontSize: 78, fontWeight: 800, color: "#202124", letterSpacing: "-0.02em" }}>Appreciation</div>
            <div style={{ display: "flex", marginTop: 60, fontSize: 30, fontWeight: 700, letterSpacing: "0.24em", color: "#7a7f87" }}>
              PRESENTED TO
            </div>
            <div style={{ display: "flex", marginTop: 30, fontSize: 90, fontWeight: 800, color: BRAND, letterSpacing: "-0.02em", textAlign: "center" }}>
              {cert.name}
            </div>
            <div style={{ display: "flex", marginTop: 34, width: 620, height: 2, background: "#e3e5e9" }} />
            <div style={{ display: "flex", marginTop: 40, fontSize: 34, color: "#5f6368", textAlign: "center", maxWidth: 760, lineHeight: 1.5 }}>
              In recognition of a generous contribution of {rupeesPlain(cert.amountPaise)} to the NNAWCA alumni network.
            </div>
            <div style={{ display: "flex", marginTop: 36, fontSize: 26, fontWeight: 700, letterSpacing: "0.22em", color: BRAND }}>
              {tier.label.toUpperCase()} SUPPORTER
            </div>
          </div>

          {/* footer: date · seal · site */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", width: "100%" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#202124" }}>{fmtDate(cert.paidAt)}</div>
              <div style={{ display: "flex", marginTop: 8, width: 220, height: 2, background: "#c9ccd1" }} />
              <div style={{ display: "flex", marginTop: 8, fontSize: 22, letterSpacing: "0.14em", color: "#9aa0a6" }}>DATE</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 128, height: 128, borderRadius: 100, background: "#ffffff", border: "3px solid #eceef1" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={MARK_URI} width={72} height={72} alt="" />
              </div>
              <div style={{ display: "flex", width: 84, height: 12, marginTop: 4 }}>
                <div style={{ display: "flex", flex: 1, background: "#4285F4" }} />
                <div style={{ display: "flex", flex: 1, background: "#EA4335" }} />
                <div style={{ display: "flex", flex: 1, background: "#FBBC05" }} />
                <div style={{ display: "flex", flex: 1, background: "#34A853" }} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#202124" }}>nnawca.org</div>
              <div style={{ display: "flex", marginTop: 8, width: 220, height: 2, background: "#c9ccd1" }} />
              <div style={{ display: "flex", marginTop: 8, fontSize: 22, letterSpacing: "0.14em", color: "#9aa0a6" }}>JNV NAGPUR</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...STORY },
  )
}

/** PNG bytes of the story certificate. */
export async function renderStoryPng(cert: Certificate): Promise<Uint8Array> {
  const res = storyImageResponse(cert)
  return new Uint8Array(await res.arrayBuffer())
}

/**
 * Wrap the story PNG into a single-page PDF. sharp transcodes PNG→JPEG (RGB,
 * DCTDecode) which embeds into a hand-built PDF without any PDF library.
 */
export async function pngToPdf(png: Uint8Array): Promise<Uint8Array> {
  const jpeg = await sharp(Buffer.from(png)).jpeg({ quality: 88 }).toBuffer()
  return jpegToPdf(jpeg, STORY.width, STORY.height)
}

function jpegToPdf(jpeg: Buffer, wpx: number, hpx: number): Uint8Array {
  const pageW = 595.28 // A4 width in points
  const pageH = pageW * (hpx / wpx)
  const enc = (s: string) => Buffer.from(s, "latin1")

  const parts: Buffer[] = []
  const offsets: number[] = []
  let pos = 0
  const push = (b: Buffer) => { parts.push(b); pos += b.length }
  const addObj = (b: Buffer) => { offsets.push(pos); push(b) }

  push(enc("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n"))
  addObj(enc("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"))
  addObj(enc("2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n"))
  addObj(enc(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`))
  addObj(Buffer.concat([
    enc(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${wpx} /Height ${hpx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),
    jpeg,
    enc("\nendstream\nendobj\n"),
  ]))
  const content = enc(`q ${pageW.toFixed(2)} 0 0 ${pageH.toFixed(2)} 0 0 cm /Im0 Do Q\n`)
  addObj(Buffer.concat([enc(`5 0 obj\n<< /Length ${content.length} >>\nstream\n`), content, enc("endstream\nendobj\n")]))

  const xrefPos = pos
  let xref = "xref\n0 6\n0000000000 65535 f \n"
  for (const off of offsets) xref += `${String(off).padStart(10, "0")} 00000 n \n`
  push(enc(xref))
  push(enc(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`))

  return new Uint8Array(Buffer.concat(parts))
}
