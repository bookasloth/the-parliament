// Who may pin/unpin any post to the feed. For now: site admins + the owner
// account (by email). Add more via FEED_PINNERS or a role later.
const FEED_PINNERS = new Set(["sndatarkar@gmail.com"])

export function canPinFeed(user: { email?: string | null; isAdmin?: boolean }): boolean {
  return !!(user.isAdmin || (user.email && FEED_PINNERS.has(user.email.toLowerCase())))
}
