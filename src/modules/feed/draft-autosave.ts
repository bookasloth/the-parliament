// Pure decision logic for composer draft autosave (DB-free, unit-tested).

/** Whether an autosave should fire right now. Gates out edit mode (never fork a
 *  draft off a published post), empty composers, and no-op re-saves (content
 *  unchanged since the last successful save). */
export function shouldAutosaveDraft(opts: {
  editing: boolean
  hasContent: boolean
  snapshot: string
  savedSnapshot: string
}): boolean {
  if (opts.editing) return false
  if (!opts.hasContent) return false
  return opts.snapshot !== opts.savedSnapshot
}

/** Create the draft on the first save, update the same row thereafter — so
 *  typing never spawns more than one draft. */
export function draftSaveMode(draftId: string | null | undefined): "create" | "update" {
  return draftId ? "update" : "create"
}
