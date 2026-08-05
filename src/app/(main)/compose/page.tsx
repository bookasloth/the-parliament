"use client"

import PostComposer from "@/components/shared/PostComposer"
import { createPostAction } from "./actions"

export default function ComposePage() {
  return (
    <PostComposer
      onSubmit={async (data) => {
        await createPostAction(data)
        // createPostAction redirects to /feed on success.
      }}
      onSaveDraft={async (data) => {
        await createPostAction({ ...data, asDraft: true })
        // Redirects to /compose/drafts on success.
      }}
    />
  )
}
