import { ImageResponse } from "next/og"

// Site-wide social share card. Next auto-wires this to og:image and
// twitter:image (summary_large_image). Generated at build/edge — no asset file.
export const alt = "NNAWCA — JNV Nagpur Alumni Network"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// The NNAWCA mark, inlined as a data URI so satori can render it as an <img>.
// Keep in sync with src/components/shared/Logo.tsx (LogoMark) + src/app/icon.svg.
const MARK = `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="d" x1="10.5" y1="12" x2="37.5" y2="36" gradientUnits="userSpaceOnUse"><stop stop-color="#EA4335"/><stop offset="0.55" stop-color="#FBBC05"/><stop offset="1" stop-color="#F9AB00"/></linearGradient></defs><rect x="6" y="8" width="9" height="32" rx="4.5" fill="#4285F4"/><rect x="33" y="8" width="9" height="32" rx="4.5" fill="#34A853"/><path d="M10.5 12 L37.5 36" stroke="url(#d)" stroke-width="9" stroke-linecap="round" fill="none"/></svg>`
const MARK_URI = `data:image/svg+xml,${encodeURIComponent(MARK)}`

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #06122a 0%, #0c1d3d 55%, #1a3266 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MARK_URI} width={132} height={132} alt="" />
          <div style={{ fontSize: 92, fontWeight: 800, letterSpacing: "-0.02em" }}>NNAWCA</div>
        </div>
        <div style={{ marginTop: 24, fontSize: 34, color: "rgba(255,255,255,0.72)", maxWidth: 900 }}>
          The official alumni network of JNV Nagpur
        </div>
        <div
          style={{
            marginTop: 44,
            width: 260,
            height: 8,
            borderRadius: 4,
            background: "linear-gradient(90deg, #4285F4, #34A853)",
          }}
        />
      </div>
    ),
    { ...size },
  )
}
