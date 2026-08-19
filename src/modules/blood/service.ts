import { prisma } from "@/lib/prisma"
import { env } from "@/config/env"
import { normalizeWhatsAppDestination } from "@/lib/aisensy"
import { sendWhatsAppToRecipients, type WhatsAppRecipient } from "@/modules/whatsapp/service"
import { donorGroupsFor, isBloodGroup } from "./compatibility"

/**
 * Blood request → WhatsApp utility broadcast to compatible donors.
 *
 * Recipients = active members of the compatible donor groups (see
 * `compatibility.ts`) who opted in to WhatsApp and have a usable number.
 * Optionally narrowed to the request's city and/or `bloodDonor` volunteers.
 */

export interface DonorContact {
  userId: string
  name: string
  phone: string | null
  whatsappOptIn: boolean
  status: string
  city: string | null
  bloodDonor: boolean
}

export interface BloodMatchOptions {
  requesterId: string
  /** City where blood is needed; donors are matched against this. */
  city: string | null
  sameCityOnly: boolean
  donorsOnly: boolean
}

const normCity = (c: string | null | undefined): string | null =>
  (c ?? "").trim().toLowerCase() || null

/**
 * Pure eligibility filter for a blood broadcast. Extracted from IO for tests.
 * Excludes the requester, inactive/opted-out members, and (optionally)
 * out-of-city or non-volunteer members. Deduped by WhatsApp destination.
 */
export function matchBloodDonors(
  members: DonorContact[],
  opts: BloodMatchOptions,
): WhatsAppRecipient[] {
  const wantCity = normCity(opts.city)
  const seen = new Set<string>()
  const out: WhatsAppRecipient[] = []
  for (const m of members) {
    if (m.userId === opts.requesterId) continue
    if (m.status !== "active" || !m.whatsappOptIn) continue
    if (opts.donorsOnly && !m.bloodDonor) continue
    // Only apply the city gate when we actually know the target city.
    if (opts.sameCityOnly && wantCity && normCity(m.city) !== wantCity) continue
    const destination = normalizeWhatsAppDestination(m.phone)
    if (!destination || seen.has(destination)) continue
    seen.add(destination)
    out.push({ userId: m.userId, name: m.name, destination })
  }
  return out
}

// ponytail: 5000-member cap — single-school base is well under it.
async function compatibleDonorContacts(patientGroup: string): Promise<DonorContact[]> {
  const donorGroups = donorGroupsFor(patientGroup)
  if (!donorGroups.length) return []
  const groups = await prisma.group.findMany({
    where: { type: "blood", refDepartment: { in: donorGroups } },
    select: { id: true },
  })
  if (!groups.length) return []
  const rows = await prisma.groupMember.findMany({
    where: { groupId: { in: groups.map((g) => g.id) }, status: "active" },
    take: 5000,
    select: {
      user: {
        select: {
          id: true,
          status: true,
          displayName: true,
          legalName: true,
          mobileE164: true,
          profile: { select: { whatsappOptIn: true, city: true, bloodDonor: true } },
        },
      },
    },
  })
  return rows.map((r) => ({
    userId: r.user.id,
    name: r.user.displayName || r.user.legalName || "Member",
    phone: r.user.mobileE164,
    whatsappOptIn: r.user.profile?.whatsappOptIn ?? false,
    status: r.user.status,
    city: r.user.profile?.city ?? null,
    bloodDonor: r.user.profile?.bloodDonor ?? false,
  }))
}

export interface BloodRequestInput {
  bloodGroup: string
  patient: string
  city: string
  hospital: string
  contact: string
  unitsNeeded?: number | null
  /** Notify compatible donors in every city, not just the request city. */
  allCities?: boolean
  /** Restrict to members who flagged themselves as blood donors. */
  donorsOnly?: boolean
}

export interface BloodRequestResult {
  requestId: string
  recipientCount: number
  sent: number
  failed: number
  skipped: boolean
}

/** How many donors a request would reach, without sending (for a preview). */
export async function previewBloodAudience(
  requesterId: string,
  input: Pick<BloodRequestInput, "bloodGroup" | "city" | "allCities" | "donorsOnly">,
): Promise<number> {
  if (!isBloodGroup(input.bloodGroup)) return 0
  const contacts = await compatibleDonorContacts(input.bloodGroup)
  return matchBloodDonors(contacts, {
    requesterId,
    city: input.city,
    sameCityOnly: !input.allCities,
    donorsOnly: !!input.donorsOnly,
  }).length
}

export async function createBloodRequest(
  requesterId: string,
  input: BloodRequestInput,
): Promise<BloodRequestResult> {
  if (!isBloodGroup(input.bloodGroup)) throw new Error("Invalid blood group")
  const patient = input.patient.trim()
  const city = input.city.trim()
  const hospital = input.hospital.trim()
  const contact = input.contact.trim()
  if (!patient) throw new Error("Enter the patient / for whom")
  if (!city) throw new Error("Enter the city")
  if (!hospital) throw new Error("Enter the hospital")
  if (!normalizeWhatsAppDestination(contact)) throw new Error("Enter a valid contact number")

  const contacts = await compatibleDonorContacts(input.bloodGroup)
  const recipients = matchBloodDonors(contacts, {
    requesterId,
    city,
    sameCityOnly: !input.allCities,
    donorsOnly: !!input.donorsOnly,
  })

  // Template param order (see the approved AiSensy template):
  // {{1}} group · {{2}} patient · {{3}} city · {{4}} hospital · {{5}} contact
  const templateParams = [input.bloodGroup, patient, city, hospital, contact]

  const { sent, failed, skipped } = await sendWhatsAppToRecipients(recipients, {
    campaignName: env.aisensyBloodCampaign,
    templateParams,
    source: `blood:${input.bloodGroup}`,
  })

  const req = await prisma.bloodRequest.create({
    data: {
      requesterId,
      bloodGroup: input.bloodGroup,
      patient,
      city,
      hospital,
      contact,
      unitsNeeded: input.unitsNeeded ?? null,
      allCities: !!input.allCities,
      donorsOnly: !!input.donorsOnly,
      recipientCount: recipients.length,
      sentCount: sent,
      failedCount: failed,
    },
    select: { id: true },
  })

  return { requestId: req.id, recipientCount: recipients.length, sent, failed, skipped }
}
