export interface AnnouncementInput {
  title: string
  body: string | null
  ctaLabel: string | null
  ctaHref: string | null
  startsAt: Date
  endsAt: Date
}

/**
 * Validate + normalize an announcement payload. Dep-free (no prisma) so it's
 * unit-testable. Throws with a human-readable message on bad input.
 */
export function validateAnnouncement(input: {
  title?: string
  body?: string | null
  ctaLabel?: string | null
  ctaHref?: string | null
  startsAt?: string | Date
  endsAt?: string | Date
}): AnnouncementInput {
  const title = (input.title ?? "").trim()
  if (title.length < 3) throw new Error("Title must be at least 3 characters")
  if (title.length > 200) throw new Error("Title too long")

  const starts = input.startsAt ? new Date(input.startsAt) : null
  const ends = input.endsAt ? new Date(input.endsAt) : null
  if (!starts || Number.isNaN(starts.getTime())) throw new Error("Invalid start date")
  if (!ends || Number.isNaN(ends.getTime())) throw new Error("Invalid end date")
  if (ends <= starts) throw new Error("End must be after start")

  const ctaLabel = input.ctaLabel?.trim() || null
  const ctaHref = input.ctaHref?.trim() || null
  if (ctaLabel && !ctaHref) throw new Error("CTA label needs a link")
  if (ctaHref && !ctaLabel) throw new Error("CTA link needs a label")
  if (ctaHref && !/^(https?:\/\/|\/)/.test(ctaHref)) throw new Error("CTA link must be a URL or a path starting with /")

  return { title, body: input.body?.trim() || null, ctaLabel, ctaHref, startsAt: starts, endsAt: ends }
}
