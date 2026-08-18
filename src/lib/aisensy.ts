import { env } from "@/config/env"

/**
 * AiSensy WhatsApp transport (Campaign API v2).
 *
 * We only send **utility** messages: business-initiated, transactional. The
 * message body + WhatsApp category live in a Meta-approved template that is
 * wired to a "live API campaign" inside the AiSensy dashboard. Our code never
 * chooses a category or template text — it references an approved campaign by
 * `campaignName` and fills the template's ordered `{{n}}` slots via
 * `templateParams`.
 *
 * Docs: https://wiki.aisensy.com/en/article/api-campaign
 *
 * Fail-closed: if AISENSY_API_KEY is unset, `sendWhatsAppCampaign` returns a
 * skipped result instead of throwing, so the app runs fine before the key lands.
 */

const DEFAULT_COUNTRY_CODE = "91" // India (JNV Nagpur alumni base)
const TIMEOUT_MS = 15_000

export function isAiSensyConfigured(): boolean {
  return Boolean(env.aisensyApiKey)
}

/**
 * Normalise a stored phone (E.164 `+91…`, or a bare local number) to AiSensy's
 * `destination` format: digits only, country-code prefixed, no `+`.
 * Returns null if the number can't be a valid WhatsApp destination.
 *
 * - `+919876543210` → `919876543210`
 * - `9876543210`    → `919876543210` (assumes India)
 * - `+1 415 555 0100` → `14155550100`
 */
export function normalizeWhatsAppDestination(
  raw: string | null | undefined,
  defaultCountryCode = DEFAULT_COUNTRY_CODE,
): string | null {
  if (!raw) return null
  const hadPlus = raw.trim().startsWith("+")
  let digits = raw.replace(/\D/g, "")
  if (!digits) return null
  // A bare 10-digit number with no country code → assume the default CC.
  if (!hadPlus && digits.length === 10) digits = defaultCountryCode + digits
  // WhatsApp/E.164: country code + subscriber number, 8–15 digits total.
  if (digits.length < 8 || digits.length > 15) return null
  return digits
}

export interface WhatsAppCampaignInput {
  /** Name of a live API campaign in AiSensy, bound to an approved template. */
  campaignName: string
  /** Recipient phone (E.164 or local); normalised before send. */
  destination: string
  /** Recipient display name — AiSensy requires a non-empty userName. */
  userName: string
  /** Ordered values for the template's `{{1}}`, `{{2}}`, … placeholders. */
  templateParams?: string[]
  /** Free-form tag for AiSensy analytics (e.g. "group:blood-o+"). */
  source?: string
  /** Optional custom attributes stored against the AiSensy contact. */
  attributes?: Record<string, string>
}

export type WhatsAppSendResult =
  | { ok: true; skipped?: false; providerMessageId?: string }
  | { ok: false; skipped?: boolean; error: string }

/**
 * Send one utility-template WhatsApp message via AiSensy.
 * Never throws — always resolves to a result the caller can tally.
 */
export async function sendWhatsAppCampaign(
  input: WhatsAppCampaignInput,
): Promise<WhatsAppSendResult> {
  if (!isAiSensyConfigured()) {
    return { ok: false, skipped: true, error: "AiSensy not configured (AISENSY_API_KEY unset)" }
  }

  const destination = normalizeWhatsAppDestination(input.destination)
  if (!destination) return { ok: false, error: "Invalid destination phone number" }
  if (!input.campaignName) return { ok: false, error: "campaignName is required" }
  const userName = input.userName?.trim() || "Member"

  const payload: Record<string, unknown> = {
    apiKey: env.aisensyApiKey,
    campaignName: input.campaignName,
    destination,
    userName,
    templateParams: input.templateParams ?? [],
  }
  if (input.source) payload.source = input.source
  if (input.attributes) payload.attributes = input.attributes

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(env.aisensyApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    const text = await res.text()
    let body: unknown = null
    try { body = text ? JSON.parse(text) : null } catch { /* non-JSON error body */ }

    if (!res.ok) {
      const msg = extractError(body) ?? text ?? `HTTP ${res.status}`
      return { ok: false, error: `AiSensy ${res.status}: ${msg}`.slice(0, 300) }
    }
    // AiSensy returns 200 with { success: true, ... } on accept.
    const success = typeof body === "object" && body !== null && (body as { success?: boolean }).success
    if (success === false) {
      return { ok: false, error: extractError(body) ?? "AiSensy rejected the message" }
    }
    return { ok: true, providerMessageId: extractMessageId(body) }
  } catch (e) {
    const msg = e instanceof Error && e.name === "AbortError" ? "AiSensy request timed out" : String(e)
    return { ok: false, error: msg.slice(0, 300) }
  } finally {
    clearTimeout(timer)
  }
}

function extractError(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) return undefined
  const b = body as { message?: unknown; error?: unknown; errorMessage?: unknown }
  const m = b.message ?? b.error ?? b.errorMessage
  return typeof m === "string" ? m : undefined
}

function extractMessageId(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) return undefined
  const b = body as { messageId?: unknown; id?: unknown; submitted_message_id?: unknown }
  const id = b.messageId ?? b.id ?? b.submitted_message_id
  return typeof id === "string" ? id : undefined
}
