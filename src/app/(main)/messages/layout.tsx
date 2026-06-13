"use client"

import { usePathname } from "next/navigation"
import { ChatSidebar } from "./ChatSidebar"

/**
 * Master-detail messaging shell (sits under the private navbar).
 *  - Desktop: chat list (left) + conversation/empty-state (right), always both.
 *  - Mobile: list fills the screen on /messages; the conversation fills the
 *    screen on /messages/[id] and the list is hidden (back button returns).
 */
export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const inConversation = pathname !== "/messages"

  return (
    <div className="h-[calc(100dvh-3.5rem)] bg-[#f3f2ef] overflow-hidden p-0 sm:p-4 lg:px-6 lg:py-5">
      {/* Floating chat card with gutters on all sides (full-bleed on mobile) */}
      <div className="mx-auto flex h-full max-w-[1280px] overflow-hidden rounded-none border-0 bg-white sm:rounded-2xl sm:border sm:border-gray-200 sm:shadow-sm">
        {/* Chat list */}
        <aside
          className={`${inConversation ? "hidden lg:flex" : "flex"} w-full flex-col border-r border-gray-200 bg-white lg:w-[340px] xl:w-[380px] flex-shrink-0`}
        >
          <ChatSidebar />
        </aside>

        {/* Detail (conversation or empty state) */}
        <main className={`${inConversation ? "flex" : "hidden lg:flex"} min-w-0 flex-1 flex-col bg-white`}>
          {children}
        </main>
      </div>
    </div>
  )
}
