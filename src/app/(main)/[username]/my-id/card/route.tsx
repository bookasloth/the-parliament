import { ImageResponse } from "next/og"
import QRCode from "qrcode"
import { auth } from "@/lib/auth"
import { env } from "@/config/env"
import { ogFonts } from "@/lib/og"
import { signIdCardToken } from "@/lib/id-card-token"
import { loadIdCardData, type IdCardTier } from "@/modules/id-card/data"
import { CARD_PX } from "@/config/id-card"

// Downloadable print face of a member's ID card — CR80 portrait PNG.
// Owner-only: only the signed-in holder can render/download their own card.

const TIER_ACCENT: Record<IdCardTier, string> = {
  life: "#c8952b",
  premium: "#0a4d8c",
  committee: "#7c6bd6",
  student: "#2e9e5b",
  associate: "#009ae4",
  member: "#5b6675",
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params
  const session = await auth()
  const viewerId = session?.user?.id
  if (!viewerId) return new Response("Unauthorized", { status: 401 })

  const data = await loadIdCardData(username)
  if (!data) return new Response("Not found", { status: 404 })

  // Owner-only (admins allowed too so the fulfilment queue can render prints).
  const isOwner = viewerId === data.userId
  if (!isOwner && !session?.user?.isAdmin) {
    return new Response("Forbidden", { status: 403 })
  }

  const token = signIdCardToken(data.userId)
  const verifyUrl = `${env.authUrl}/verify/${token}`
  const qr = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 320, errorCorrectionLevel: "M" })

  const fonts = await ogFonts()
  const font = fonts.length ? "Jakarta" : "sans-serif"
  const accent = TIER_ACCENT[data.tier]
  const { w, h } = CARD_PX
  const pad = 72

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          fontFamily: font,
          background: "linear-gradient(160deg, #faf7f1 0%, #efeadf 100%)",
          padding: pad,
          position: "relative",
        }}
      >
        {/* tier stripe down the right edge */}
        <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 26, background: accent, display: "flex" }} />

        {/* header: brand + est */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 66, fontWeight: 800, color: "#15171d", letterSpacing: 1 }}>NNAWCA</div>
            <div style={{ fontSize: 26, fontWeight: 600, color: "#666c78", letterSpacing: 2, marginTop: 4 }}>
              JNV NAGPUR ALUMNI
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: "#9aa4b2", letterSpacing: 2, marginTop: 10 }}>
            EST. 2023
          </div>
        </div>

        {/* photo */}
        <div
          style={{
            display: "flex",
            width: "100%",
            height: 640,
            borderRadius: 32,
            marginTop: 44,
            background: "#e5e1d6",
            overflow: "hidden",
            border: `4px solid ${accent}`,
          }}
        >
          {data.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.photoUrl} width={w - pad * 2} height={640} alt="" style={{ objectFit: "cover" }} />
          ) : (
            <div
              style={{
                display: "flex",
                width: "100%",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 260,
                fontWeight: 800,
                color: "#fff",
                background: accent,
              }}
            >
              {data.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* name + role */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 40 }}>
          <div style={{ fontSize: 76, fontWeight: 800, color: "#15171d", lineHeight: 1.05 }}>{data.name}</div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 16 }}>
            <div
              style={{
                display: "flex",
                fontSize: 26,
                fontWeight: 800,
                color: "#fff",
                background: accent,
                borderRadius: 999,
                padding: "8px 24px",
                letterSpacing: 1,
              }}
            >
              {data.tierLabel.toUpperCase()}
            </div>
            {data.house && (
              <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: "#666c78", marginLeft: 20 }}>
                {data.house} House
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", height: 2, background: "#e1dbcb", marginTop: 40 }} />

        {/* id fields + QR */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 40, flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[
              ["ID NO.", data.idNumber],
              ["BATCH", data.batch ?? "—"],
              ["LOCATION", data.location],
              ["VALID THRU", data.validThru],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", alignItems: "baseline", marginBottom: 22 }}>
                <div style={{ display: "flex", width: 220, fontSize: 26, fontWeight: 600, color: "#9aa4b2", letterSpacing: 1 }}>
                  {label}
                </div>
                <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: "#15171d" }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", padding: 14, background: "#fff", borderRadius: 20, border: "2px solid #e1dbcb" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} width={260} height={260} alt="" />
            </div>
            <div style={{ display: "flex", fontSize: 22, fontWeight: 600, color: "#9aa4b2", marginTop: 14, letterSpacing: 1 }}>
              SCAN TO VERIFY
            </div>
          </div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 30, fontSize: 26, fontWeight: 600, color: "#666c78", letterSpacing: 3 }}>
          nnawca.org{data.username ? `/${data.username}` : ""}
        </div>
      </div>
    ),
    { width: w, height: h, fonts },
  )
}
