import { describe, it, expect } from "vitest"
import { renderEmail, EMAIL_TEMPLATE_KEYS, EMAIL_CATEGORY, type EmailTemplates } from "@/lib/email"
import { emailShell, button, details, LOGO_URL, LEGAL_NAME, CONTACT_EMAIL } from "@/lib/email-layout"
import { SEED_TEMPLATES } from "@/modules/email/templates"
import { welcomeTemplateFor } from "@/modules/membership/activation"

// Representative data for every lib/email template.
const SAMPLE: { [K in keyof EmailTemplates]: EmailTemplates[K] } = {
  email_verification: { legalName: "Shubham", code: "789201" },
  email_verify_link: { legalName: "Shubham", verifyUrl: "https://x/verify?t=1" },
  password_reset: { legalName: "Shubham", resetUrl: "https://x/reset?t=1", isNew: false },
  verification_approved: { legalName: "Shubham", loginUrl: "https://x/login" },
  verification_rejected: { legalName: "Shubham", reason: "ID photo unreadable" },
  new_follower: { fromName: "Neha Gupta", profileUrl: "https://x/u/neha" },
  comment_on_post: { fromName: "Neha Gupta", postUrl: "https://x/p/1" },
  reaction_on_post: { fromName: "Neha Gupta", postUrl: "https://x/p/1" },
  mention: { fromName: "Neha Gupta", postUrl: "https://x/p/1" },
  contact_reveal_request: { fromName: "Neha Gupta", profileUrl: "https://x/u/neha" },
  new_event_in_batch: { eventTitle: "Reunion 2026", eventUrl: "https://x/e/1" },
}

describe("email-layout shell", () => {
  const html = emailShell({
    accent: "emerald",
    pill: "Receipt",
    eyebrow: "Payment · Confirmed",
    heading: "Your <em>contribution</em> is confirmed",
    body: details([["Amount", "₹2,500"]], "emerald") + button("Download", "https://x/inv", "emerald"),
    reason: "Transactional receipt.",
  })

  it("includes brand chrome: logo, legal name, contact, signature bar", () => {
    expect(html).toContain(LOGO_URL)
    expect(html).toContain(LEGAL_NAME)
    expect(html).toContain(CONTACT_EMAIL)
    expect(html).toContain("#E5484D") // the red band in the 45/25/20/20 signature rule
  })

  it("accents the <em> word in the category colour and renders the button href", () => {
    expect(html).toContain("#2E9E5B") // emerald accent used somewhere
    expect(html).toContain('href="https://x/inv"')
    // <em> must be styled, never left bare.
    expect(html).not.toMatch(/<em>(?!\s*style)/)
  })

  it("shows Manage/Unsubscribe only when urls are provided", () => {
    const withManage = emailShell({ accent: "navy", pill: "P", eyebrow: "E", heading: "H", body: "", manageUrl: "https://x/m", unsubscribeUrl: "https://x/u" })
    expect(withManage).toContain("Manage preferences")
    expect(withManage).toContain("Unsubscribe")
    const without = emailShell({ accent: "navy", pill: "P", eyebrow: "E", heading: "H", body: "" })
    expect(without).not.toContain("Unsubscribe")
  })
})

describe("lib/email templates", () => {
  it("covers all 11 keys, each mapped to a category", () => {
    expect(EMAIL_TEMPLATE_KEYS).toHaveLength(11)
    for (const k of EMAIL_TEMPLATE_KEYS) expect(EMAIL_CATEGORY[k]).toBeTruthy()
  })

  for (const key of Object.keys(SAMPLE) as (keyof EmailTemplates)[]) {
    it(`${key} renders cleanly`, () => {
      const { subject, text, html } = renderEmail(key, SAMPLE[key])
      expect(subject.length).toBeGreaterThan(0)
      expect(text.length).toBeGreaterThan(0)
      expect(html).toContain(LOGO_URL)
      expect(html).toContain(LEGAL_NAME)
      // No unresolved interpolation or stringified objects leaking through.
      expect(html).not.toContain("undefined")
      expect(html).not.toContain("[object Object]")
      expect(html).not.toContain("{{") // JS-interpolated system: no handlebars left
    })
  }
})

describe("modules/email seed templates", () => {
  it("has the expected 7 templates with unique codes", () => {
    expect(SEED_TEMPLATES).toHaveLength(7)
    const codes = SEED_TEMPLATES.map((t) => t.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  for (const t of SEED_TEMPLATES) {
    it(`${t.code} is well-formed`, () => {
      expect(t.subject.length).toBeGreaterThan(0)
      expect(t.text.length).toBeGreaterThan(0)
      expect(t.html).toContain(LOGO_URL)
      expect(t.html).toContain(LEGAL_NAME)
      // Author-time JS interpolation must be fully resolved — only {{vars}} remain.
      expect(t.html).not.toContain("${")
      expect(t.html).not.toContain("undefined")
      // Every declared variable is actually referenced somewhere in the template.
      for (const v of Object.keys(t.variables)) {
        expect(`${t.html} ${t.text}`).toContain(`{{${v}}}`)
      }
    })
  }
})

describe("membership welcome email wiring", () => {
  it("maps each newly-activated paid tier to its welcome template", () => {
    expect(welcomeTemplateFor("associate", "purchase")).toBe("membership.welcome_associate")
    expect(welcomeTemplateFor("premium", "upgrade")).toBe("membership.welcome_premium")
    expect(welcomeTemplateFor("life", "admin_grant")).toBe("membership.welcome_life")
  })
  it("sends no welcome on renewal, or for student/committee tiers", () => {
    expect(welcomeTemplateFor("premium", "renewal")).toBeNull()
    expect(welcomeTemplateFor("associate", "renewal")).toBeNull()
    expect(welcomeTemplateFor("student", "purchase")).toBeNull()
    expect(welcomeTemplateFor("committee", "admin_grant")).toBeNull()
  })
})

// The DB templates these wirings fill — pin their variable sets so a template
// edit that drops or renames a var breaks this test instead of silently sending "".
const WIRED_DB_VARS: Record<string, string[]> = {
  "membership.welcome_associate": ["firstName", "manageUrl", "renewalDate"],
  "membership.welcome_premium": ["firstName", "manageUrl", "renewalDate"],
  "membership.welcome_life": ["firstName", "profileUrl"],
  "membership.expiry_t_minus_7": ["firstName", "planName", "expiresOn", "renewUrl"],
}

describe("wired DB templates expose exactly the variables their callers fill", () => {
  for (const [code, vars] of Object.entries(WIRED_DB_VARS)) {
    it(`${code} declares ${vars.join(", ")}`, () => {
      const t = SEED_TEMPLATES.find((s) => s.code === code)
      if (!t) throw new Error(`seed template ${code} missing`)
      expect(Object.keys(t.variables).sort()).toEqual([...vars].sort())
    })
  }
})
