import Link from "next/link"
import {
  Users, UserPlus, Layers, Calendar, MapPin, Building2, Mail, ChevronRight,
} from "lucide-react"
import { sidebarNav, me } from "../network-data"

const ICONS = {
  users: Users,
  userPlus: UserPlus,
  layers: Layers,
  calendar: Calendar,
  mapPin: MapPin,
  building: Building2,
  mail: Mail,
} as const

export function NetworkSidebar() {
  return (
    <nav aria-label="Manage your network" className="space-y-4">
      {/* Profile mini-card */}
      <Link
        href={`/profile/${me.username}`}
        className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-card transition-shadow"
      >
        <div className="flex items-center gap-3">
          <img
            src={me.avatar}
            alt={me.name}
            loading="lazy"
            className="h-12 w-12 rounded-full object-cover border-2 border-brand"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{me.name}</p>
            <p className="text-xs text-gray-500 truncate">{me.headline}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2">
          <span className="text-xs text-gray-600">Connections</span>
          <span className="text-sm font-bold text-brand tabular-nums">{me.connections}</span>
        </div>
      </Link>

      {/* Manage Network */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <p className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Manage Network
        </p>
        <ul>
          {sidebarNav.map((item) => {
            const Icon = ICONS[item.icon]
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Icon className="h-4.5 w-4.5 text-gray-400 group-hover:text-brand transition-colors flex-shrink-0" />
                  <span className="flex-1 font-medium">{item.label}</span>
                  {item.count != null ? (
                    <span className="text-xs font-semibold text-gray-400 tabular-nums">{item.count}</span>
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
