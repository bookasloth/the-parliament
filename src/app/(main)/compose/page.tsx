"use client"

import PostComposer from "@/components/shared/PostComposer"
import { createPostAction, autosaveDraftAction } from "./actions"

export default function ComposePage() {
  return (
    <PostComposer
      onSubmit={async (data) => {
        await createPostAction(data)
        // createPostAction redirects to /feed on success.
      }}
      onAutosaveDraft={(data, draftId) => autosaveDraftAction(data, draftId ?? undefined)}
    />
  )
}
