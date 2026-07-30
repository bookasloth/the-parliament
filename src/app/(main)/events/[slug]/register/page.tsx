import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { ArrowLeft } from "lucide-react"
import { requireUser } from "@/modules/auth/session"
import { getEventById, rsvpEvent } from "@/modules/events/service"

export const dynamic = "force-dynamic"

export default async function EventRegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const user = await requireUser()

  const result = await getEventById(slug, user.id).catch(() => null)
  if (!result) notFound()
  const { event } = result

  async function submit(formData: FormData) {
    "use server"
    const u = await requireUser()
    const status = String(formData.get("status") ?? "going")
    await rsvpEvent(u.id, event.id, status)
    revalidatePath(`/events/${event.id}`)
    revalidatePath("/events")
    redirect(`/events/${event.id}`)
  }

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 py-6 space-y-4">
      <Link
        href={`/events/${event.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to event
      </Link>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">RSVP</h1>
          <p className="mt-1 text-sm text-gray-500">{event.title}</p>
        </div>

        <form action={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Are you attending?
            </label>
            <div className="space-y-2">
              {[
                { value: "going", label: "Going" },
                { value: "interested", label: "Interested" },
                { value: "not_going", label: "Not going" },
              ].map((o) => (
                <label
                  key={o.value}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="status"
                    value={o.value}
                    defaultChecked={o.value === "going"}
                    className="text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-800">{o.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Confirm RSVP
          </button>
        </form>
      </div>
    </div>
  )
}
