"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import PostComposer from "@/components/shared/PostComposer"
import { createPostAction, autosaveDraftAction } from "./actions"

function ComposeInner() {
  // Prefill from ?text= (e.g. "Share to Community" on a game result).
  const prefill = useSearchParams().get("text") ?? undefined
  return (
    <PostComposer
      initial={prefill ? { body: prefill } : undefined}
      onSubmit={async (data) => {
        await createPostAction(data)
        // createPostAction redirects to /feed on success.
      }}
      onAutosaveDraft={(data, draftId) => autosaveDraftAction(data, draftId ?? undefined)}
    />
  )
}

export default function ComposePage() {
  return (
    <Suspense>
      <ComposeInner />
    </Suspense>
  )
}
