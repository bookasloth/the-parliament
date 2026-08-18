"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UsersThree, Trash, Plus } from "@phosphor-icons/react"
import { PageHeader, Button, EmptyState, useRowAction } from "../admin-ui"
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
  const { run, isBusy } = useRowAction()
  // Optimistically hide removed rows; server-generated ids for new rows can't be
  // predicted, so adds fall back to router.refresh() instead of optimism.
  const [removed, setRemoved] = useState<Record<string, boolean>>({})

  function add(committee: string, form: HTMLFormElement) {
    const data = new FormData(form)
    const email = String(data.get("email") || "").trim()
    const name = String(data.get("name") || "").trim()
    const role = String(data.get("role") || "member")
    if (!email) return
    run(`add:${committee}`, {
      action: async () => {
        const res = await addCommitteeMemberAction({ committee, email, name, role })
        if (!res.ok) throw new Error(res.error || "Could not add member")
        form.reset()
        router.refresh()
      },
      success: "Member added",
    })
  }

  function remove(id: string) {
    run(id, {
      optimistic: () => setRemoved((r) => ({ ...r, [id]: true })),
      revert: () =>
        setRemoved((r) => {
          const n = { ...r }
          delete n[id]
          return n
        }),
      action: async () => {
        const res = await removeCommitteeMemberAction(id)
        if (!res.ok) throw new Error(res.error || "Could not remove member")
      },
      success: "Member removed",
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
          const list = members.filter((m) => m.committee === c.key && !removed[m.id])
          return (
            <section key={c.key} className="rounded-[5px] border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">{c.label}</h2>
                  <p className="mt-0.5 text-xs text-gray-500">Emailed about: {ROUTES[c.key] || "—"}</p>
                </div>
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                  {list.length} {list.length === 1 ? "member" : "members"}
                </span>
              </div>

              <div className="mt-3 divide-y divide-gray-200">
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
                        <p className="truncate text-sm text-gray-800">
                          {m.name || m.email}
                          {m.role === "chair" && (
                            <span className="ml-2 rounded-full bg-blue-600/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                              Chair
                            </span>
                          )}
                        </p>
                        {m.name && <p className="truncate text-xs text-gray-500">{m.email}</p>}
                      </div>
                      <button
                        onClick={() => remove(m.id)}
                        disabled={isBusy(m.id)}
                        aria-label={`Remove ${m.email}`}
                        className="shrink-0 rounded-[3px] p-1.5 text-gray-500 hover:bg-gray-100 hover:text-red-600 disabled:opacity-50"
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
                className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3"
              >
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="email@example.com"
                  className="min-w-[10rem] flex-1 rounded-[4px] border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-600 focus:outline-none"
                />
                <input
                  name="name"
                  placeholder="Name (optional)"
                  className="min-w-[8rem] flex-1 rounded-[4px] border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-600 focus:outline-none"
                />
                <select
                  name="role"
                  defaultValue="member"
                  className="rounded-[4px] border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-700 focus:border-blue-600 focus:outline-none"
                >
                  <option value="member">Member</option>
                  <option value="chair">Chair</option>
                </select>
                <Button type="submit" size="sm" disabled={isBusy(`add:${c.key}`)}>
                  <Plus className="h-4 w-4" weight="bold" /> Add
                </Button>
              </form>
            </section>
          )
        })}
      </div>
    </div>
  )
}
