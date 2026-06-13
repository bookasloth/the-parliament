"use client"

import { useState } from "react"
import { useParams, notFound } from "next/navigation"
import { motion } from "framer-motion"
import {
  ArrowLeft, Users, MapPin, CalendarDays, UserPlus, Check, Bell, BellOff, Share2,
} from "lucide-react"
import { AlumniProfileCard } from "@/components/shared/AlumniProfileCard"
import { EventCard } from "../../components/EventCard"
import { ActivityCard } from "../../components/ActivityCard"
import { getChapterDetail } from "../../network-data"

type Tab = "about" | "members" | "events"

export default function ChapterDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const chapter = getChapterDetail(slug)

  const [joined, setJoined] = useState(chapter?.joined ?? false)
  const [muted, setMuted] = useState(false)
  const [tab, setTab] = useState<Tab>("about")
  const [connected, setConnected] = useState<string[]>([])

  if (!chapter) notFound()

  const memberCount = chapter.members + (joined && !chapter.joined ? 1 : 0)

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "about", label: "About" },
    { key: "members", label: "Members", count: chapter.members_list.length },
    { key: "events", label: "Events", count: chapter.events.length },
  ]

  return (
    <div className="min-h-screen bg-[#f3f2ef] pb-16">
      {/* Sticky sub-header */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[52px] max-w-[1000px] items-center gap-3 px-4 sm:px-6">
          <a href="/network" className="flex flex-shrink-0 items-center gap-1.5 text-gray-500 transition-colors hover:text-brand">
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden text-sm font-medium sm:inline">Network</span>
          </a>
          <span className="flex-1 truncate text-sm font-semibold text-gray-900">{chapter.name}</span>
          {joined && (
            <button
              onClick={() => setMuted((v) => !v)}
              aria-label={muted ? "Unmute chapter" : "Mute chapter"}
              className="flex-shrink-0 rounded-full p-2 text-gray-400 hover:bg-gray-100"
            >
              {muted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-[1000px] space-y-0 px-0 py-0 sm:space-y-4 sm:px-6 sm:py-4">
        {/* Hero */}
        <div className="overflow-hidden border-0 border-gray-200 bg-white sm:rounded-xl sm:border">
          <div className="relative h-36 sm:h-48">
            <img src={chapter.hero} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
            <div className="absolute bottom-3 left-4 flex items-center gap-1.5 text-xs text-white/85">
              <MapPin className="h-3.5 w-3.5" /> {chapter.city}
            </div>
          </div>

          <div className="px-4 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold leading-snug text-gray-900 sm:text-xl">{chapter.name}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{memberCount} members</span>
                  <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{chapter.founded}</span>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  aria-label="Share chapter"
                  className="rounded-full border border-gray-200 p-2 text-gray-400 transition-colors hover:border-brand hover:text-brand"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setJoined((v) => !v)}
                  aria-pressed={joined}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition-colors ${
                    joined
                      ? "border border-gray-200 bg-gray-100 text-gray-600"
                      : "bg-brand text-white hover:bg-brand-600"
                  }`}
                >
                  {joined ? <><Check className="h-4 w-4" /> Joined</> : <><UserPlus className="h-4 w-4" /> Join</>}
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="scrollbar-none flex overflow-x-auto border-t border-gray-100">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                aria-selected={tab === t.key}
                className={`flex flex-shrink-0 items-center gap-1.5 border-b-2 px-5 py-3 text-xs font-semibold transition-colors ${
                  tab === t.key ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
                {t.count != null && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === t.key ? "bg-brand text-white" : "bg-gray-100 text-gray-500"}`}>{t.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 sm:px-0">
          {/* About */}
          {tab === "about" && (
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="min-w-0 flex-1 space-y-4">
                <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                  <h2 className="mb-2 text-base font-semibold text-gray-900">About this chapter</h2>
                  <p className="text-sm leading-relaxed text-gray-600">{chapter.about}</p>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                  <h2 className="mb-2 text-base font-semibold text-gray-900">Recent Activity</h2>
                  {chapter.activity.length > 0 ? (
                    <ul className="divide-y divide-gray-50">
                      {chapter.activity.map((a) => <ActivityCard key={a.id} entry={a} />)}
                    </ul>
                  ) : (
                    <p className="py-6 text-center text-sm text-gray-400">No recent activity.</p>
                  )}
                </section>
              </div>

              {/* Organizers rail */}
              <aside className="lg:w-72 lg:flex-shrink-0">
                <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                  <h2 className="mb-3 text-base font-semibold text-gray-900">Organizers</h2>
                  <ul className="space-y-3">
                    {chapter.members_list.filter((m) => m.role).map((m) => (
                      <li key={m.card.id} className="flex items-center gap-3">
                        <img src={m.card.image} alt={m.card.name} loading="lazy" className="h-10 w-10 rounded-full object-cover" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{m.card.name}</p>
                          <p className="truncate text-xs text-brand">{m.role}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              </aside>
            </div>
          )}

          {/* Members */}
          {tab === "members" && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {chapter.members_list.map((m, i) => {
                const isConnected = connected.includes(m.card.id)
                return (
                  <motion.div
                    key={m.card.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.05 }}
                  >
                    <AlumniProfileCard
                      alumni={m.card}
                      profileHref={`/profile/${m.card.id}`}
                      verified={m.verified}
                      footer={m.role ? <p className="text-xs font-medium text-brand">{m.role}</p> : undefined}
                      actions={
                        <>
                          <a
                            href={`/profile/${m.card.id}`}
                            className="rounded-md border border-brand bg-white px-4 py-1.5 text-sm font-medium text-brand transition-all duration-300 hover:bg-brand hover:text-white"
                          >
                            View Profile
                          </a>
                          <button
                            onClick={() => setConnected((c) => (c.includes(m.card.id) ? c.filter((x) => x !== m.card.id) : [...c, m.card.id]))}
                            className={`flex items-center gap-1.5 rounded-md border px-4 py-1.5 text-sm font-medium transition-all duration-300 ${
                              isConnected ? "border-gray-200 bg-gray-100 text-gray-600" : "border-brand bg-brand text-white hover:bg-white hover:text-brand"
                            }`}
                          >
                            {isConnected ? <><Check className="h-3.5 w-3.5" /> Pending</> : <><UserPlus className="h-3.5 w-3.5" /> Connect</>}
                          </button>
                        </>
                      }
                    />
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Events */}
          {tab === "events" && (
            chapter.events.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {chapter.events.map((e) => <EventCard key={e.id} event={e} />)}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
                <CalendarDays className="mx-auto mb-3 h-10 w-10 text-gray-200" />
                <p className="text-sm font-medium text-gray-500">No upcoming events</p>
                <p className="mt-1 text-xs text-gray-400">Check back soon for {chapter.city} meetups.</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
