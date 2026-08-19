// Copy for the official NNAWCA account. Branding is always "NNAWCA" — never
// "The Parliament" (that's the internal codename, not the member-facing brand).
//
// `{mention}` is replaced with the member's real @handle so the welcome POST
// actually mentions them (links + fires a mention notification), not just prints
// a name. Templates are picked deterministically per user (see pickTemplate) so
// the same member always gets the same welcome and tests are stable.

export const WELCOME_TEMPLATES: string[] = [
  "Welcome to NNAWCA, {mention}! 🎉 Great to have another Navodayan on board. Complete your profile and find your batchmates in the directory.",
  "A warm NNAWCA welcome to {mention}! 🙏 The family just got bigger. Say hello in the feed whenever you're ready.",
  "{mention} has joined NNAWCA! 🎊 Once a Navodayan, always a Navodayan. Explore the directory and reconnect with old friends.",
  "Welcome aboard, {mention}! 🌟 NNAWCA is your home for everything JNV Nagpur — batchmates, events, and mentorship all in one place.",
  "So glad you're here, {mention}! 💙 On behalf of the whole NNAWCA community — welcome. Tell us your batch and house in your profile.",
  "{mention} is now part of NNAWCA! 🤝 Reconnect with your batch, discover alumni near you, and jump into the conversation.",
  "Welcome to the NNAWCA family, {mention}! 🏡 Those mess-hall days built us — now let's stay connected. Start by completing your profile.",
  "Hey {mention}, welcome to NNAWCA! ✨ Your batchmates are waiting in the directory. Go say hi.",
  "Big welcome to {mention} from all of us at NNAWCA! 🎓 Share an update, find an event, or mentor a junior — the community is yours.",
  "{mention} just walked into NNAWCA! 🚪💙 Make yourself at home — update your profile so old friends can find you.",
  "Welcome, {mention}! 🎉 NNAWCA connects JNV Nagpur alumni across the world. You're in good company.",
  "Delighted to have you, {mention}! 🙌 From Navegaon Khairi to wherever you are now — NNAWCA keeps the bond alive.",
  "{mention}, welcome to NNAWCA! 🌱 Every Navodayan story matters. Post yours whenever you're ready.",
  "A hearty NNAWCA welcome to {mention}! 🥳 Find your batch, RSVP to reunions, and give back through mentorship.",
  "Glad you made it, {mention}! 💫 NNAWCA is built by alumni, for alumni. Dive into the feed and introduce yourself.",
  "Welcome home, {mention}! 🏠 The NNAWCA community is stronger with you in it. Complete your profile to get started.",
  "{mention} has arrived! 🎈 Welcome to NNAWCA — reconnect, contribute, and celebrate the JNV Nagpur spirit.",
  "Namaste {mention}, and welcome to NNAWCA! 🙏 Your journey with us starts now. Explore, connect, belong.",
  "Cheers to {mention} for joining NNAWCA! 🎉 Old classmates, new opportunities — it's all here. Say hello in the feed.",
  "Welcome to NNAWCA, {mention}! 💙 Once a Navodayan, always family. We're happy you're here.",
]

// Private 1:1 welcome DM from the bot. Addressed to the member by name ({name}),
// warmer + more actionable than the public post. Same NNAWCA-only branding.
export const WELCOME_DM_TEMPLATES: string[] = [
  "Hi {name}, welcome to NNAWCA! 👋 I'm the official NNAWCA account. Two quick wins: finish your profile so batchmates can find you, and browse the directory to reconnect. Reach out anytime.",
  "Namaste {name}! 🙏 So glad you joined NNAWCA. Tip: add your batch, house, and a photo to your profile — it's how old friends recognise you. See you in the feed!",
  "Welcome aboard, {name}! 🎉 This is the official NNAWCA account. Whenever you're ready — complete your profile, RSVP to upcoming events, and say hi to your batch. We're happy you're here.",
  "Hey {name}, warm welcome to NNAWCA! 💙 Start by filling in your profile and exploring the directory. Events and mentorship are just a click away. Glad to have you in the family.",
  "Hello {name}! 🌟 Welcome to the NNAWCA community. A complete profile unlocks the most out of the network — batchmates, events, and more. Ping us if you ever need anything.",
  "Welcome, {name}! 🎓 On behalf of NNAWCA — great to have you. Add your details, find your batch, and jump into the conversation whenever you like. Here's to staying connected.",
]

/**
 * Deterministic per-user template pick — same member always gets the same
 * welcome, and tests are stable (no Math.random). Simple char-sum hash.
 */
export function pickTemplate(templates: string[], seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i)) % templates.length
  return templates[h]
}
