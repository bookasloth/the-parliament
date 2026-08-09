"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { UsersThree, Trash, Plus } from "@phosphor-icons/react"
import { PageHeader, Button, EmptyState } from "../admin-ui"
import { COMMITTEES } from "@/config/committees"
import { addCommitteeMemberAction, removeCommitteeMemberAction } from "./actions"

export interface MemberRow {
  id: string
  committee: string
  email: string
  name: string | null
  role: string
}

// What each committee is emailed about — mirrors the routing in the services.
const ROUTES: Record<string, string> = {
  alumni_student: "New alumni verification requests",
  sports_culture: "New events created",
  tech_media: "New content / moderation reports",
  executive: "New Life / Premium memberships",
}

export default function CommitteesClient({ members }: { members: MemberRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function add(committee: string, form: HTMLFormElement) {
    const data = new FormData(form)
    const email = String(data.get("email") || "").trim()
    const name = String(data.get("name") || "").trim()
    const role = String(data.get("role") || "member")
    if (!email) return
    setError(null)
    startTransition(async () => {
      const res = await addCommitteeMemberAction({ committee, email, name, role })
      if (!res.ok) setError(res.error || "Could not add member")
      else {
        form.reset()
        router.refresh()
      }
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      await removeCommitteeMemberAction(id)
      router.refresh()
    })
  }

  return (
    <div>
      <PageHeader
        title="Committees"
        description="Members here receive committee emails at their personal address. People rotate — add or remove them anytime."
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {COMMITTEES.map((c) => {
          const list = members.filter((m) => m.committee === c.key)
          return (
            <section key={c.key} className="rounded-[5px] border border-zinc-800 bg-[#111113] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100">{c.label}</h2>
                  <p className="mt-0.5 text-xs text-zinc-500">Emailed about: {ROUTES[c.key] || "—"}</p>
                </div>
                <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400">
                  {list.length} {list.length === 1 ? "member" : "members"}
                </span>
              </div>

              <div className="mt-3 divide-y divide-zinc-800">
                {list.length === 0 ? (
                  <EmptyState
                    icon={<UsersThree className="h-6 w-6" weight="duotone" />}
                    title="No members yet"
                    description="Add an email below to start routing this committee's mail."
                  />
                ) : (
                  list.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-zinc-200">
                          {m.name || m.email}
                          {m.role === "chair" && (
                            <span className="ml-2 rounded-full bg-blue-600/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
                              Chair
                            </span>
                          )}
                        </p>
                        {m.name && <p className="truncate text-xs text-zinc-500">{m.email}</p>}
                      </div>
                      <button
                        onClick={() => remove(m.id)}
                        disabled={pending}
                        aria-label={`Remove ${m.email}`}
                        className="shrink-0 rounded-[3px] p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400 disabled:opacity-50"
                      >
                        <Trash className="h-4 w-4" weight="duotone" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  add(c.key, e.currentTarget)
                }}
                className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-3"
              >
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="email@example.com"
                  className="min-w-[10rem] flex-1 rounded-[4px] border border-zinc-800 bg-[#0a0a0a] px-2.5 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-blue-600 focus:outline-none"
                />
                <input
                  name="name"
                  placeholder="Name (optional)"
                  className="min-w-[8rem] flex-1 rounded-[4px] border border-zinc-800 bg-[#0a0a0a] px-2.5 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-blue-600 focus:outline-none"
                />
                <select
                  name="role"
                  defaultValue="member"
                  className="rounded-[4px] border border-zinc-800 bg-[#0a0a0a] px-2 py-1.5 text-sm text-zinc-300 focus:border-blue-600 focus:outline-none"
                >
                  <option value="member">Member</option>
                  <option value="chair">Chair</option>
                </select>
                <Button type="submit" size="sm" disabled={pending}>
                  <Plus className="h-4 w-4" weight="bold" /> Add
                </Button>
              </form>
            </section>
          )
        })}
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </div>
  )
}
