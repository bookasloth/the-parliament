"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { Menu, X, Users, Network, Compass } from "lucide-react"
import { NetworkSidebar } from "./components/NetworkSidebar"
import { AlumniCard } from "./components/AlumniCard"
import { AlumniCarousel } from "./components/AlumniCarousel"
import { PendingRequests } from "./components/PendingRequests"
import { EventCard } from "./components/EventCard"
import { ChapterCard } from "./components/ChapterCard"
import { ActivityCard } from "./components/ActivityCard"
import {
  suggestedAlumni, incomingRequests, sentRequests, recentActivity,
  suggestedEvents, chapters, DISCOVERY_TABS,
  type DiscoveryTab, type NetworkAlumni,
} from "./network-data"

const ME_BATCH = "2014"
const ME_CITY = "Bangalore"
const ME_COMPANY = "Google"
const PAGE_SIZE = 6

/** Deterministic tab filter over the mock pool. */
function filterByTab(tab: DiscoveryTab, pool: NetworkAlumni[]): NetworkAlumni[] {
  switch (tab) {
    case "nearby": return pool.filter((a) => a.city === ME_CITY)
    case "batch": return pool.filter((a) => a.batch === ME_BATCH)
    case "company": return pool.filter((a) => a.company === ME_COMPANY)
    case "mentors": return pool.filter((a) => a.membership === "life" || Number(a.batch) < Number(ME_BATCH))
    case "committee": return pool.filter((a) => a.membership === "committee")
    default: return pool
  }
}

const TAB_EMPTY: Record<DiscoveryTab, string> = {
  discover: "You're connected with everyone we can suggest. Check back soon.",
  nearby: "No alumni found near you yet. Update your location to discover more.",
  batch: "You're connected with everyone from your batch. Explore other alumni.",
  company: "No alumni from your company yet. Be the first to add yours.",
  mentors: "No mentors available right now. Browse the directory instead.",
  committee: "No committee members to show here.",
}

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="h-[60px] w-full animate-pulse bg-gray-100" />
      <div className="px-4 pb-4">
        <div className="-mt-8 h-16 w-16 animate-pulse rounded-full border-4 border-white bg-gray-200" />
        <div className="mt-3 h-3.5 w-2/3 animate-pulse rounded bg-gray-200" />
        <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-gray-100" />
        <div className="mt-3 h-3 w-full animate-pulse rounded bg-gray-100" />
        <div className="mt-1.5 h-3 w-4/5 animate-pulse rounded bg-gray-100" />
        <div className="mt-4 h-8 w-full animate-pulse rounded-md bg-gray-100" />
      </div>
    </div>
  )
}

export default function NetworkPage() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tab, setTab] = useState<DiscoveryTab>("discover")
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(PAGE_SIZE)
  // Optimistic connect / dismiss state.
  const [connected, setConnected] = useState<string[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])

  // Simulate initial fetch — skeletons while loading.
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600)
    return () => clearTimeout(t)
  }, [])

  // Reset pagination on tab change.
  useEffect(() => { setVisible(PAGE_SIZE) }, [tab])

  const pool = useMemo(() => suggestedAlumni.filter((a) => !dismissed.includes(a.id)), [dismissed])
  const tabResults = useMemo(() => filterByTab(tab, pool), [tab, pool])
  const shown = tabResults.slice(0, visible)

  const onConnect = (id: string) => setConnected((c) => (c.includes(id) ? c : [...c, id]))
  const onDismiss = (id: string) => setDismissed((d) => [...d, id])

  const carouselPool = pool.filter((a) => !connected.includes(a.id)).slice(0, 8)

  return (
    <div className="min-h-screen bg-[#f3f2ef] pb-16">
      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setDrawerOpen(false)} aria-hidden />
      )}
      <div className={`fixed left-0 top-0 z-50 h-full w-80 overflow-y-auto bg-[#f3f2ef] p-4 shadow-xl transition-transform lg:hidden ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-3 flex justify-end">
          <button onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="rounded-lg p-1.5 hover:bg-gray-200">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <NetworkSidebar />
      </div>

      {/* Sticky sub-header */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[52px] max-w-[1400px] items-center gap-3 px-4 sm:px-6">
          <button onClick={() => setDrawerOpen(true)} aria-label="Open menu" className="rounded-lg p-1.5 hover:bg-gray-100 lg:hidden">
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          <Network className="h-5 w-5 flex-shrink-0 text-brand" />
          <span className="text-sm font-semibold text-gray-900">Alumni Network</span>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6">
        <div className="flex gap-6">
          {/* Left sidebar — desktop */}
          <aside className="hidden w-1/4 flex-shrink-0 lg:block">
            <div className="sticky top-[68px]">
              <NetworkSidebar />
            </div>
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1 space-y-5">
            {/* Pending requests (collapsed by default) */}
            <PendingRequests incoming={incomingRequests} sent={sentRequests} />

            {/* People You May Know */}
            <AlumniCarousel
              title="People You May Know"
              subtitle="Based on batch, location, company, and shared connections."
            >
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
                : carouselPool.map((a) => (
                    <AlumniCard
                      key={a.id}
                      alumni={a}
                      connected={connected.includes(a.id)}
                      dismissed={false}
                      onConnect={onConnect}
                      onDismiss={onDismiss}
                    />
                  ))}
            </AlumniCarousel>

            {/* Discovery tabs */}
            <section>
              <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="scrollbar-none flex overflow-x-auto" role="tablist" aria-label="Discover alumni">
                  {DISCOVERY_TABS.map((t) => (
                    <button
                      key={t.key}
                      role="tab"
                      aria-selected={tab === t.key}
                      onClick={() => setTab(t.key)}
                      className={`flex-shrink-0 border-b-2 px-5 py-3.5 text-sm font-semibold transition-colors ${
                        tab === t.key
                          ? "border-brand text-brand"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
                </div>
              ) : shown.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {shown.map((a, i) => (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: (i % PAGE_SIZE) * 0.05 }}
                      >
                        <AlumniCard
                          alumni={a}
                          connected={connected.includes(a.id)}
                          dismissed={false}
                          onConnect={onConnect}
                          onDismiss={onDismiss}
                        />
                      </motion.div>
                    ))}
                  </div>
                  {visible < tabResults.length && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => setVisible((v) => v + PAGE_SIZE)}
                        className="rounded-full border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-brand hover:text-brand"
                      >
                        Load more
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState message={TAB_EMPTY[tab]} />
              )}
            </section>

            {/* Events You May Like */}
            <AlumniCarousel title="Events You May Like" itemClassName="w-[230px]">
              {suggestedEvents.map((e) => <EventCard key={e.id} event={e} />)}
            </AlumniCarousel>

            {/* Chapters & Communities */}
            <AlumniCarousel title="Chapters & Communities" itemClassName="w-[230px]">
              {chapters.map((c) => <ChapterCard key={c.id} chapter={c} />)}
            </AlumniCarousel>

            {/* Recent Activity */}
            <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
              <h2 className="mb-2 text-base font-semibold text-gray-900">Recent Alumni Activity</h2>
              {recentActivity.length > 0 ? (
                <ul className="divide-y divide-gray-50">
                  {recentActivity.map((entry) => <ActivityCard key={entry.id} entry={entry} />)}
                </ul>
              ) : (
                <p className="py-8 text-center text-sm text-gray-400">No recent activity.</p>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
      <span className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand">
        <Compass className="h-7 w-7" />
      </span>
      <p className="max-w-xs text-sm font-medium text-gray-600">{message}</p>
      <a href="/directory" className="mt-4 rounded-full bg-brand px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600">
        Browse Directory
      </a>
    </div>
  )
}
