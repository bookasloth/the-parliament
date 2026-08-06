// Tiny client-side flag so the navbar (which can't see call state — that lives
// in ConversationView) knows when the viewer is already in a call, and can
// suppress a second incoming-call ring. Module singleton = shared across the
// bundle on the client. ponytail: a global boolean, not a store — one writer
// (the open conversation), one reader (the navbar ring handler).
let active = false

export function setCallActive(v: boolean): void {
  active = v
}

export function isCallActive(): boolean {
  return active
}
