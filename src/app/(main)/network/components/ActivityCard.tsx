import Link from "next/link"
import { UserPlus, CalendarCheck, Award, FileText, ArrowRight } from "lucide-react"
import type { ActivityEntry } from "../network-data"

const TYPE_ICON = {
  join: UserPlus,
  event: CalendarCheck,
  badge: Award,
  post: FileText,
} as const

const TYPE_ACTION = {
  join: "View",
  event: "View event",
  badge: "View profile",
  post: "Read",
} as const

export function ActivityCard({ entry }: { entry: ActivityEntry }) {
  const Icon = TYPE_ICON[entry.type]
  return (
    <li className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-gray-50">
      <Link href={`/profile/${entry.username}`} className="relative flex-shrink-0">
        <img src={entry.avatar} alt={entry.name} loading="lazy" className="h-10 w-10 rounded-full object-cover" />
        <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-brand text-white ring-2 ring-white">
          <Icon className="h-3 w-3" />
        </span>
      </Link>
      <p className="min-w-0 flex-1 text-sm text-gray-700">
        <Link href={`/profile/${entry.username}`} className="font-semibold text-gray-900 hover:text-brand transition-colors">{entry.name}</Link>{" "}
        {entry.action}
        <span className="block text-xs text-gray-400">{entry.when}</span>
      </p>
      <Link
        href={entry.href ?? "#"}
        className="flex flex-shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand-50"
      >
        {TYPE_ACTION[entry.type]} <ArrowRight className="h-3 w-3" />
      </Link>
    </li>
  )
}
