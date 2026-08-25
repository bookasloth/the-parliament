import type { ReportableEntity } from "./service"

// Human label for the warned content, used in the email/notification copy.
export const WARN_LABEL: Record<ReportableEntity, string> = {
  post: "post",
  comment: "comment",
  profile: "profile",
  business: "business listing",
  message: "message",
  vyapaar_bug: "game bug report",
}

/**
 * Pure builder for the warning notification/email payload. Kept dependency-free
 * (type-only import above) so the reason fallback + content-type label are
 * unit-testable without loading prisma/next.
 */
export function buildWarnPayload(
  entityType: ReportableEntity,
  name: string,
  notes: string | undefined,
  appUrl: string,
) {
  const reason = notes?.trim() || "Your content was reported and reviewed by our moderators."
  return {
    title: "You've received a moderation warning",
    body: reason,
    email: { legalName: name, reason, contentType: WARN_LABEL[entityType], appUrl },
  }
}
