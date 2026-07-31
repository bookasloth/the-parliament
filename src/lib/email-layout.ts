// Shared, email-client-safe layout for every NNAWCA email.
//
// ONE shell, used by both senders:
//   - src/lib/email.ts       — JS template functions, data interpolated in JS.
//   - src/modules/email/*    — HTML stored in DB with {{placeholders}}, filled
//                              at send by fillVars. Author-time calls to emailShell
//                              here embed {{vars}} literally into the body/heading.
//
// Design system (locked 2026-07):
//   single-colour top rule · logo-left + category pill-right · eyebrow → heading →
//   body · left-border detail card · full-width category-coloured button ·
//   Zoho-style 45/25/20/20 (Blue·Red·Green·Yellow) signature bar · footer with
//   legal name, contact e-mail, and pages.
//
// Structural bits (wrapper, header, button, detail rows) are table-based so they
// survive Outlook; the decorative signature bar uses flex and may degrade there.
// ponytail: not full VML-bulletproofed — audience is Gmail/Apple-heavy. Add VML
// button fallbacks only if Outlook-on-Windows turns out to matter.

// Swap this to the exact NNAWCA asset path once confirmed on the CDN.
export const LOGO_URL = "https://website-assets.shubhamdatarkar.in/nnawca/logo-mark.png"
export const CONTACT_EMAIL = "alumnijnvnagpur@gmail.com"
export const LEGAL_NAME = "Nagpur Navodaya Alumni Welfare and Charitable Association"
const SITE = process.env.AUTH_URL || "https://nnawca.org"

const FONT =
  "'Poppins','Century Gothic',system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

export type Accent = "blue" | "navy" | "gold" | "emerald"

interface AccentSpec {
  bar: string
  pillBg: string
  pillText: string
  btnBg: string
  btnText: string
  eyebrow: string
}

// One accent per email category. Gold uses a navy button with gold text (white
// on gold fails contrast), everything else buttons in its own colour.
const ACCENTS: Record<Accent, AccentSpec> = {
  blue: { bar: "#009AE4", pillBg: "#EAF6FD", pillText: "#0077B3", btnBg: "#009AE4", btnText: "#ffffff", eyebrow: "#009AE4" },
  navy: { bar: "#0C1D3D", pillBg: "#E9ECF3", pillText: "#0C1D3D", btnBg: "#0C1D3D", btnText: "#ffffff", eyebrow: "#0C1D3D" },
  gold: { bar: "#D4A017", pillBg: "#FBF3DD", pillText: "#9A7400", btnBg: "#0C1D3D", btnText: "#F3D56E", eyebrow: "#B58900" },
  emerald: { bar: "#2E9E5B", pillBg: "#E7F4EC", pillText: "#1E7A43", btnBg: "#2E9E5B", btnText: "#ffffff", eyebrow: "#2E9E5B" },
}

// --- body primitives (compose the `body` string) ---
export const p = (html: string): string =>
  `<p style="margin:0 0 16px;font-family:${FONT};font-size:14.5px;line-height:1.68;color:#43506B">${html}</p>`

export const small = (html: string): string =>
  `<p style="margin:0 0 4px;font-family:${FONT};font-size:12.5px;line-height:1.6;color:#8A94A6">${html}</p>`

/** Full-width, category-coloured CTA. Table-based for Outlook. */
export function button(label: string, href: string, accent: Accent): string {
  const a = ACCENTS[accent]
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 10px"><tr><td align="center" bgcolor="${a.btnBg}" style="border-radius:12px">
  <a href="${href}" style="display:block;font-family:${FONT};font-size:15px;font-weight:600;color:${a.btnText};text-decoration:none;padding:15px 20px;border-radius:12px">${label}</a>
</td></tr></table>`
}

/** Left-border key/value detail card (Plan/Amount/Date, etc.). */
export function details(rows: [string, string][], accent: Accent): string {
  const a = ACCENTS[accent]
  const trs = rows
    .map(([k, v], i) => {
      const b = i < rows.length - 1 ? "border-bottom:1px solid #EDEFF3;" : ""
      return `<tr><td style="padding:11px 0;${b}font-family:${FONT};font-size:14px;color:#8A94A6;width:40%">${k}</td><td style="padding:11px 0;${b}font-family:${FONT};font-size:14px;font-weight:600;color:#0C1D3D;text-align:right">${v}</td></tr>`
    })
    .join("")
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;border-left:3px solid ${a.bar};border-radius:0 10px 10px 0;margin:6px 0 22px"><tr><td style="padding:2px 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${trs}</table></td></tr></table>`
}

/** Big letter-spaced OTP / code block. */
export function codeBox(code: string): string {
  return `<div style="font-family:${FONT};font-size:32px;font-weight:700;letter-spacing:.28em;color:#0C1D3D;background:#F7F8FA;border:1px solid #EAEDF2;border-radius:12px;padding:20px;text-align:center;margin:4px 0 18px">${code}</div>`
}

/** Gold-dotted benefit list. */
export function bullets(items: string[]): string {
  const lis = items
    .map(
      (t) =>
        `<tr><td valign="top" style="padding:5px 11px 5px 2px;font-family:${FONT};line-height:1"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#D4A017">&nbsp;</span></td><td style="padding:5px 0;font-family:${FONT};font-size:14px;line-height:1.5;color:#43506B">${t}</td></tr>`,
    )
    .join("")
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 22px">${lis}</table>`
}

// --- the shell ---
export interface ShellOpts {
  accent: Accent
  /** Category pill label, e.g. "Verify", "Receipt". */
  pill: string
  /** Uppercase eyebrow above the heading. */
  eyebrow: string
  /** Heading; wrap one word in <em>…</em> to accent it in the category colour. */
  heading: string
  /** Body HTML, composed from the primitives above. */
  body: string
  /** Footer reason line ("This is a transactional message.", etc.). */
  reason?: string
  /** Non-transactional mail: pass these to show Manage / Unsubscribe links. */
  manageUrl?: string
  unsubscribeUrl?: string
}

const stripTags = (s: string): string => s.replace(/<[^>]+>/g, "")

export function emailShell(o: ShellOpts): string {
  const a = ACCENTS[o.accent]
  const heading = o.heading.replace(/<em>/g, `<em style="font-style:normal;color:${a.bar}">`)
  const manage =
    o.manageUrl || o.unsubscribeUrl
      ? ` · <a href="${o.manageUrl ?? "#"}" style="color:#6b7280;text-decoration:none">Manage preferences</a> · <a href="${o.unsubscribeUrl ?? "#"}" style="color:#6b7280;text-decoration:none">Unsubscribe</a>`
      : ""
  return `<div style="margin:0;padding:0;background:#EDEFF3">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${stripTags(o.heading)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EDEFF3">
<tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #E1E5EC;border-radius:16px;overflow:hidden">
<tr><td style="height:4px;background:${a.bar};font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:18px 32px;border-bottom:1px solid #EEF1F6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td align="left" style="font-family:${FONT}"><img src="${LOGO_URL}" width="30" height="30" alt="NNAWCA" style="vertical-align:middle;border-radius:8px;border:0"><span style="vertical-align:middle;margin-left:9px;font-weight:700;font-size:15px;color:#0C1D3D">NNAWCA</span></td>
<td align="right"><span style="font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:${a.pillText};background:${a.pillBg};padding:6px 13px;border-radius:20px">${o.pill}</span></td>
</tr></table>
</td></tr>
<tr><td style="padding:26px 32px 28px">
<p style="margin:0 0 10px;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:${a.eyebrow}">${o.eyebrow}</p>
<h1 style="margin:0 0 12px;font-family:${FONT};font-size:24px;line-height:1.2;font-weight:700;letter-spacing:-.02em;color:#0C1D3D">${heading}</h1>
${o.body}
</td></tr>
<tr><td style="font-size:0;line-height:0"><div style="display:flex;height:2px"><span style="flex:45;background:#009AE4">&nbsp;</span><span style="flex:25;background:#E5484D">&nbsp;</span><span style="flex:20;background:#2E9E5B">&nbsp;</span><span style="flex:20;background:#D4A017">&nbsp;</span></div></td></tr>
<tr><td align="center" style="background:#FBFBFC;padding:22px 32px 24px;font-family:${FONT}">
<img src="${LOGO_URL}" width="24" height="24" alt="" style="border-radius:7px;border:0">
<p style="margin:10px 0 3px;font-family:${FONT};font-size:12.5px;font-weight:600;color:#6b7280">${LEGAL_NAME}</p>
<p style="margin:0 0 12px;font-family:${FONT};font-size:11.5px;color:#9aa3b2">Nagpur, Maharashtra, India · <a href="mailto:${CONTACT_EMAIL}" style="color:#9aa3b2">${CONTACT_EMAIL}</a></p>
<p style="margin:0 0 10px;font-family:${FONT};font-size:11.5px;color:#9aa3b2;line-height:1.9"><a href="${SITE}/about" style="color:#6b7280;text-decoration:none">About</a> · <a href="mailto:${CONTACT_EMAIL}" style="color:#6b7280;text-decoration:none">Contact</a> · <a href="${SITE}/privacy" style="color:#6b7280;text-decoration:none">Privacy</a> · <a href="${SITE}/terms" style="color:#6b7280;text-decoration:none">Terms</a>${manage}</p>
${o.reason ? `<p style="margin:0 0 6px;font-family:${FONT};font-size:11px;color:#B4BBC7">${o.reason}</p>` : ""}
<p style="margin:0;font-family:${FONT};font-size:11px;color:#B4BBC7">© 2026 NNAWCA · The Parliament</p>
</td></tr>
</table>
</td></tr>
</table>
</div>`
}
