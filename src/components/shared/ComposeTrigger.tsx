"use client"

import { Image as ImageIcon, ListChecks, HelpCircle, Quote } from "lucide-react"

interface ComposeTriggerProps {
  /** Where the trigger leads — defaults to the standard /compose page */
  href?: string
  /** Placeholder text inside the trigger bar */
  placeholder?: string
  /** Avatar of the current user */
  avatar?: string
}

/**
 * The standard "add post" entry point used across the platform
 * (feed, groups, profile). Clicking anywhere leads to /compose,
 * mirroring the post types and colours of the compose page.
 */
export function ComposeTrigger({
  href = "/compose",
  placeholder = "Start a post…",
  avatar = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
}: ComposeTriggerProps) {
  const shortcuts = [
    { icon: ImageIcon, label: "Photo", color: "#2e9e5b" },
    { icon: ListChecks, label: "Poll", color: "#d4a800" },
    { icon: HelpCircle, label: "Question", color: "#e75480" },
    { icon: Quote, label: "Quote", color: "#7a4fe0" },
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3">
      <a href={href} className="flex items-center gap-3 group">
        <img src={avatar} alt="" className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
        <span className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-400 group-hover:border-brand group-hover:bg-white transition-all">
          {placeholder}
        </span>
      </a>
      <div className="flex items-center justify-around mt-2 pt-2 border-t border-gray-100">
        {shortcuts.map(({ icon: Icon, label, color }) => (
          <a
            key={label}
            href={`${href}${href.includes("?") ? "&" : "?"}type=${label.toLowerCase()}`}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <Icon className="h-4 w-4" style={{ color }} />
            <span className="hidden sm:inline">{label}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
