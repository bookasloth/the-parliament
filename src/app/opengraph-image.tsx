import { ImageResponse } from "next/og"

// Site-wide social share card. Next auto-wires this to og:image and
// twitter:image (summary_large_image). Generated at build/edge — no asset file.
export const alt = "The Parliament — JNV Nagpur Alumni Network, by NNAWCA"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: "#f3d56e",
          }}
        >
          NNAWCA
        </div>
        <div style={{ marginTop: 28, fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>
          The Parliament
        </div>
        <div style={{ marginTop: 20, fontSize: 34, color: "rgba(255,255,255,0.72)", maxWidth: 900 }}>
          The official alumni network of JNV Nagpur
        </div>
        <div
          style={{
            marginTop: 48,
            width: 260,
            height: 8,
            borderRadius: 4,
            background: "linear-gradient(90deg, #d4a82c, #f3d56e)",
          }}
        />
      </div>
    ),
    { ...size },
  )
}
