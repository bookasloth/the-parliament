"use server"

import { requireUser } from "@/modules/auth/session"
import { enforceRateLimit } from "@/lib/rate-limit"
import {
  createBloodRequest,
  previewBloodAudience,
  type BloodRequestInput,
  type BloodRequestResult,
} from "@/modules/blood/service"

export async function previewBloodAudienceAction(
  input: Pick<BloodRequestInput, "bloodGroup" | "city" | "allCities" | "donorsOnly">,
): Promise<number> {
  const u = await requireUser()
  return previewBloodAudience(u.id, input)
}

export async function createBloodRequestAction(input: BloodRequestInput): Promise<BloodRequestResult> {
  const u = await requireUser()
  // Each request fans out to many paid WhatsApp sends — cap hard per member.
  await enforceRateLimit({ bucket: "blood-request", identifier: u.id, limit: 5, windowSec: 3600 })
  return createBloodRequest(u.id, input)
}
