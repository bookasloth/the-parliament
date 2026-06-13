import { MailOpen } from "lucide-react"

/**
 * Shown in the detail pane when no conversation is selected.
 * On mobile this pane is hidden (the chat list fills the screen instead),
 * so this is effectively a desktop empty state.
 */
export default function MessagesEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <MailOpen className="h-8 w-8" />
      </div>
      <h5 className="text-lg font-bold text-gray-900">No message selected</h5>
      <p className="mt-1 max-w-xs text-sm text-gray-500">
        Select an existing message, or start a new one.
      </p>
    </div>
  )
}
