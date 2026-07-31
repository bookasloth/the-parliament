import { describe, it, expect } from "vitest"
import { receiptVars } from "@/modules/membership/receipt"
import { PLANS } from "@/config/membership"

describe("membership receiptVars", () => {
  const base = {
    legalName: "Shubham Datarkar",
    planCode: "life" as const,
    amountPaise: 500000,
    invoiceId: "inv_abc",
    invoiceNumber: "NNAWCA/2026-27/000001",
    baseUrl: "https://nnawca.org",
  }

  it("formats paise into a 2-decimal rupee string", () => {
    expect(receiptVars(base).amountInr).toBe("5000.00")
    expect(receiptVars({ ...base, amountPaise: 249900 }).amountInr).toBe("2499.00")
    expect(receiptVars({ ...base, amountPaise: 1 }).amountInr).toBe("0.01")
    expect(receiptVars({ ...base, amountPaise: 0 }).amountInr).toBe("0.00")
  })

  it("builds an app invoice URL (not a raw signed link) and de-dupes the slash", () => {
    expect(receiptVars(base).invoiceUrl).toBe("https://nnawca.org/api/membership/invoice/inv_abc")
    // trailing slash on the base must not double up
    expect(receiptVars({ ...base, baseUrl: "https://nnawca.org/" }).invoiceUrl).toBe(
      "https://nnawca.org/api/membership/invoice/inv_abc",
    )
  })

  it("resolves the plan display name and passes through name + invoice number", () => {
    const v = receiptVars(base)
    expect(v.planName).toBe(PLANS.life.displayName)
    expect(v.legalName).toBe("Shubham Datarkar")
    expect(v.invoiceNumber).toBe("NNAWCA/2026-27/000001")
  })
})
