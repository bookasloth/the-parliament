"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import {
  Building2, MapPin, Star, BadgePercent, Globe, Mail, Phone,
  Pencil, Share2, Info, MessageSquare, Tag as TagIcon,
  Users, Factory, Calendar, Landmark, Newspaper, Trash2, CornerDownRight,
} from "lucide-react"
import { Card, SectionTitle, SocialLinks, R_EL } from "@/components/shared/profile-kit"
import { submitReviewAction, createPostAction, deletePostAction, replyReviewAction } from "./actions"
import { BusinessFollowButton } from "./business-follow-button"
import { BusinessImageUploader } from "./edit/business-image-uploader"
import { useRouter } from "next/navigation"

// ─────────────────────────────────────────────
// Props — assembled in load-business.tsx
// ─────────────────────────────────────────────
export interface BusinessReviewItem {
  id: string
  rating: number
  body: string | null
  dateLabel: string
  ownerReply: string | null
  reviewer: { name: string; username: string | null; avatar: string }
}

export interface BusinessPostItem {
  id: string
  body: string
  imageUrl: string | null
  timeLabel: string
}

export interface BusinessViewData {
  slug: string
  name: string
  category: string
  description: string | null
  logoUrl: string | null
  bannerUrl: string | null
  city: string | null
  website: string | null
  contactEmail: string | null
  contactPhone: string | null
  offersAlumniDiscount: boolean
  ratingAvg: number
  ratingCount: number
  listedLabel: string
  // LinkedIn company fields
  tagline: string | null
  industry: string | null
  foundedYear: number | null
  employeeSize: string | null
  headquarters: string | null
  socialLinks: Record<string, string>
  followerCount: number
  viewerFollows: boolean | null // null = guest
  owner: { userId: string; username: string | null; name: string; avatar: string }
  reviews: BusinessReviewItem[]
  posts: BusinessPostItem[]
  isOwner: boolean
  isAuthed: boolean
  canReview: boolean
  viewerReview: { rating: number; body: string | null } | null
}

const DEFAULT_COVER = "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=70"
const RING = "#009ae4" // brand — business logos aren't tier-coloured

type Tab = "about" | "posts" | "reviews" | "contact"

// Static star row (display only).
function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} style={{ width: size, height: size }} className={n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
      ))}
    </span>
  )
}

export function BusinessView({ data }: { data: BusinessViewData }) {
  const [tab, setTab] = useState<Tab>("about")
  const [copied, setCopied] = useState(false)
  const cover = data.bannerUrl ?? DEFAULT_COVER

  function share() {
    if (typeof window === "undefined") return
    const url = `${window.location.origin}/business/${data.slug}`
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  const subline = data.tagline || data.category

  const metaBits: { icon: React.ReactNode; text: React.ReactNode }[] = [
    { icon: <TagIcon className="h-4 w-4" />, text: data.category },
  ]
  if (data.industry) metaBits.push({ icon: <Factory className="h-4 w-4" />, text: data.industry })
  if (data.city) metaBits.push({ icon: <MapPin className="h-4 w-4" />, text: data.city })
  if (data.followerCount > 0) metaBits.push({ icon: <Users className="h-4 w-4" />, text: `${data.followerCount} ${data.followerCount === 1 ? "follower" : "followers"}` })
  if (data.ratingCount > 0) metaBits.push({ icon: <Star className="h-4 w-4 fill-amber-400 text-amber-400" />, text: `${data.ratingAvg.toFixed(1)} (${data.ratingCount})` })
  if (data.offersAlumniDiscount) metaBits.push({ icon: <BadgePercent className="h-4 w-4 text-green-600" />, text: <span className="text-green-600">Alumni discount</span> })

  const logo = (
    <div className="w-fit rounded-[3px] bg-white p-[5px]" style={{ boxShadow: `0 0 0 4px ${RING}` }}>
      {data.logoUrl ? (
        <Image src={data.logoUrl} alt={data.name} className="h-[118px] w-[118px] rounded-[4px] object-cover" width={118} height={118} />
      ) : (
        <div className="flex h-[118px] w-[118px] items-center justify-center rounded-[3px] bg-brand-50 text-brand-600"><Building2 className="h-12 w-12" /></div>
      )}
    </div>
  )

  const actions = (
    <div className="flex shrink-0 items-center gap-2">
      {!data.isOwner && (
        <BusinessFollowButton slug={data.slug} initialFollowing={data.viewerFollows} initialCount={data.followerCount} />
      )}
      {data.isOwner && (
        <Link href={`/business/${data.slug}/edit`} className={`${R_EL} flex items-center gap-1.5 border border-brand bg-brand px-[18px] py-2.5 text-[13px] font-semibold text-white hover:bg-brand-600 transition-colors`}>
          <Pencil className="h-4 w-4" /> Edit
        </Link>
      )}
      <button onClick={share} className={`${R_EL} flex items-center gap-1.5 border border-gray-200 bg-white px-[14px] py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50`}>
        <Share2 className="h-4 w-4" /> {copied ? "Copied!" : "Share"}
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#eef0f4] px-4 py-6 font-body">
      <div className="mx-auto max-w-[1300px]">
        <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[1.6fr_1fr]">
          {/* Left column */}
          <div className="flex flex-col gap-[18px]">
            <Card>
              <div className="relative h-[200px] bg-gray-200">
                <Image src={cover} alt="" className="h-full w-full object-cover" fill sizes="100vw" />
                {data.offersAlumniDiscount && (
                  <span className="glass-strong absolute right-5 top-4 flex items-center gap-2 rounded-[4px] px-3 py-1.5 text-xs font-bold text-green-700">
                    <BadgePercent className="h-3.5 w-3.5" /> Alumni discount
                  </span>
                )}
              </div>
              <div className="relative px-7 pb-2">
                {/* MOBILE */}
                <div className="text-center lg:hidden">
                  <div className="-mt-[62px] flex justify-center">{logo}</div>
                  <h1 className="mt-3 font-heading text-xl font-extrabold tracking-tight text-gray-900">{data.name}</h1>
                  <p className="mt-0.5 text-[13.5px] text-gray-600">{subline}</p>
                  <div className="mt-4 flex items-center justify-center gap-2.5">{actions}</div>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-x-[18px] gap-y-1.5 border-t border-gray-100 pt-3 text-[13px] text-gray-600">
                    {metaBits.map((m, i) => <span key={i} className="flex items-center gap-1.5"><span className="text-brand">{m.icon}</span>{m.text}</span>)}
                  </div>
                </div>
                {/* DESKTOP */}
                <div className="hidden lg:block">
                  <div className="flex items-end gap-4">
                    <div className="-mt-[62px] shrink-0">{logo}</div>
                    <div className="flex min-w-0 flex-1 items-end justify-between gap-2 pb-2">
                      <div className="min-w-0">
                        <h1 className="truncate font-heading text-xl font-extrabold tracking-tight text-gray-900">{data.name}</h1>
                        <p className="mt-1 truncate text-[13.5px] text-gray-700">{subline}</p>
                      </div>
                      {actions}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-[18px] gap-y-1.5 border-t border-gray-100 pt-3 text-[13px] text-gray-600">
                    {metaBits.map((m, i) => <span key={i} className="flex items-center gap-1.5"><span className="text-brand">{m.icon}</span>{m.text}</span>)}
                  </div>
                </div>

                {/* tabs */}
                <div className="mt-3 flex justify-center gap-1.5 border-t border-gray-100 px-1 pt-1.5 lg:justify-start">
                  {([["about", "About", Info], ["posts", "Posts", Newspaper], ["reviews", "Reviews", Star], ["contact", "Contact", Phone]] as const).map(([key, label, Icon]) => (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      aria-label={label}
                      className={`flex items-center border-b-[3px] px-4 py-3 text-sm font-semibold transition-colors ${tab === key ? "border-brand text-brand" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                    >
                      <Icon className="h-[18px] w-[18px] lg:hidden" />
                      <span className="hidden lg:inline">{label}</span>
                      {key === "reviews" && data.ratingCount > 0 && (
                        <span className="ml-1 rounded-[5px] bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-600">{data.ratingCount}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Body */}
            <div className="flex min-w-0 flex-col gap-[18px]">
              {tab === "about" && (() => {
                const overview: { icon: React.ReactNode; label: string; value: string }[] = []
                if (data.industry) overview.push({ icon: <Factory className="h-4 w-4 text-brand" />, label: "Industry", value: data.industry })
                if (data.employeeSize) overview.push({ icon: <Users className="h-4 w-4 text-indigo-500" />, label: "Company size", value: data.employeeSize })
                if (data.foundedYear) overview.push({ icon: <Calendar className="h-4 w-4 text-amber-500" />, label: "Founded", value: String(data.foundedYear) })
                if (data.headquarters) overview.push({ icon: <Landmark className="h-4 w-4 text-teal-500" />, label: "Headquarters", value: data.headquarters })
                const hasSocials = Object.keys(data.socialLinks).length > 0
                const empty = !data.description && overview.length === 0 && !hasSocials
                return (
                <>
                  {data.description && (
                    <Card>
                      <SectionTitle>About this business</SectionTitle>
                      <div className="px-7 pb-6 pt-1">
                        <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-gray-700">{data.description}</p>
                      </div>
                    </Card>
                  )}
                  {overview.length > 0 && (
                    <Card>
                      <SectionTitle>Overview</SectionTitle>
                      <div className="px-7 pb-6 pt-2">
                        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {overview.map((o) => (
                            <li key={o.label} className="flex items-center gap-2.5 text-[13.5px]">
                              {o.icon}
                              <span className="text-gray-500">{o.label}:</span>
                              <span className="font-semibold text-gray-900">{o.value}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Card>
                  )}
                  <SocialLinks socialLinks={data.socialLinks} title="Links" />
                  {empty && (
                    <Card><div className="px-7 py-12 text-center text-sm text-gray-400">No details added yet.</div></Card>
                  )}
                </>
                )
              })()}

              {tab === "posts" && (
                <PostsTab data={data} />
              )}

              {tab === "reviews" && (
                <ReviewsTab data={data} />
              )}

              {tab === "contact" && (
                <Card>
                  <SectionTitle>Get in touch</SectionTitle>
                  {/* Website is public; email/phone are gated behind sign-in. */}
                  <div className="px-7 pb-6 pt-2 flex flex-col gap-3 text-sm">
                    {data.website && <a href={data.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-brand hover:underline"><Globe className="h-4 w-4" />{data.website}</a>}
                    {data.isAuthed ? (
                      <>
                        {data.contactEmail && <a href={`mailto:${data.contactEmail}`} className="flex items-center gap-2 text-brand hover:underline"><Mail className="h-4 w-4" />{data.contactEmail}</a>}
                        {data.contactPhone && <a href={`tel:${data.contactPhone}`} className="flex items-center gap-2 text-gray-700 hover:underline"><Phone className="h-4 w-4" />{data.contactPhone}</a>}
                        {!data.website && !data.contactEmail && !data.contactPhone && <p className="text-gray-400">No contact details provided.</p>}
                      </>
                    ) : (data.contactEmail || data.contactPhone) ? (
                      <p className="flex items-center gap-2 text-gray-500">
                        <Mail className="h-4 w-4" />
                        <Link href="/auth/signin" className="font-semibold text-brand hover:underline">Sign in</Link> to see email &amp; phone
                      </p>
                    ) : !data.website ? (
                      <p className="text-gray-400">No contact details provided.</p>
                    ) : null}
                  </div>
                </Card>
              )}
            </div>
          </div>{/* /left */}

          {/* Right rail */}
          <div className="flex flex-col gap-[18px] lg:sticky lg:top-4 lg:self-start lg:row-span-2">
            {/* Rating summary */}
            <Card>
              <div className="flex items-center gap-5 px-7 py-6">
                <div className="text-center">
                  <div className="font-heading text-4xl font-extrabold text-gray-900">{data.ratingCount > 0 ? data.ratingAvg.toFixed(1) : "—"}</div>
                  <div className="mt-1"><Stars value={data.ratingAvg} size={14} /></div>
                </div>
                <div className="text-[13px] text-gray-600">
                  {data.ratingCount > 0
                    ? <>Based on <span className="font-semibold text-gray-900">{data.ratingCount}</span> {data.ratingCount === 1 ? "review" : "reviews"}.</>
                    : "No reviews yet. Be the first."}
                </div>
              </div>
            </Card>

            {/* Owner */}
            <Card>
              <SectionTitle>Owner</SectionTitle>
              <div className="px-7 pb-6 pt-2">
                <Link href={`/${data.owner.username ?? data.owner.userId}`} className="flex items-center gap-3">
                  <Image src={data.owner.avatar} alt={data.owner.name} width={44} height={44} className="h-11 w-11 rounded-[4px] object-cover" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-gray-900 hover:text-brand">{data.owner.name}</div>
                    <div className="text-xs text-gray-500">JNV Nagpur alumnus</div>
                  </div>
                </Link>
              </div>
            </Card>

            {/* Contact facts */}
            <Card>
              <SectionTitle>Details</SectionTitle>
              <div className="px-7 pb-6 pt-2">
                <ul className="flex flex-col gap-2.5 text-[13.5px] text-gray-700">
                  <li className="flex items-center gap-2"><TagIcon className="h-4 w-4 text-brand" /> {data.category}</li>
                  {data.city && <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-teal-500" /> {data.city}</li>}
                  {data.offersAlumniDiscount && <li className="flex items-center gap-2"><BadgePercent className="h-4 w-4 text-green-600" /> Offers alumni discount</li>}
                  <li className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-gray-400" /> Listed {data.listedLabel}</li>
                </ul>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// Reviews list + write form.
function ReviewsTab({ data }: { data: BusinessViewData }) {
  const [rating, setRating] = useState(data.viewerReview?.rating ?? 0)
  const [hover, setHover] = useState(0)
  const [body, setBody] = useState(data.viewerReview?.body ?? "")
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (rating < 1) { setMsg({ ok: false, text: "Pick a star rating first." }); return }
    setBusy(true)
    setMsg(null)
    try {
      const r = await submitReviewAction({ slug: data.slug, rating, body })
      setMsg(r.ok ? { ok: true, text: "Review saved." } : { ok: false, text: r.error })
    } catch {
      setMsg({ ok: false, text: "Failed to save review." })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-[18px]">
      {data.canReview && (
        <Card>
          <SectionTitle>{data.viewerReview ? "Edit your review" : "Write a review"}</SectionTitle>
          <div className="px-7 pb-6 pt-2">
            <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)} className="p-0.5">
                  <Star className={`h-7 w-7 transition-colors ${n <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                </button>
              ))}
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Share your experience (optional)…"
              className={`mt-3 w-full ${R_EL} border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-brand`}
            />
            <div className="mt-3 flex items-center gap-3">
              <button onClick={submit} disabled={busy} className={`${R_EL} bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-600 disabled:opacity-50`}>
                {busy ? "Saving…" : data.viewerReview ? "Update review" : "Post review"}
              </button>
              {msg && <span className={`text-xs font-medium ${msg.ok ? "text-green-600" : "text-red-500"}`}>{msg.text}</span>}
            </div>
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle>Reviews</SectionTitle>
        {data.reviews.length === 0 ? (
          <div className="px-7 py-12 text-center text-sm text-gray-400">No reviews yet.</div>
        ) : (
          <div className="divide-y divide-gray-100 px-5 pb-3">
            {/* Guests preview the 3 newest; full list is behind sign-in. */}
            {(data.isAuthed ? data.reviews : data.reviews.slice(0, 3)).map((r) => (
              <div key={r.id} className="flex gap-3 py-4">
                <Link href={`/${r.reviewer.username ?? "#"}`} className="flex-shrink-0">
                  <Image src={r.reviewer.avatar} alt={r.reviewer.name} width={40} height={40} className="h-10 w-10 rounded-[4px] object-cover" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{r.reviewer.name}</span>
                    <Stars value={r.rating} size={13} />
                    <span className="text-xs text-gray-400">{r.dateLabel}</span>
                  </div>
                  {r.body && <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{r.body}</p>}
                  <OwnerReply slug={data.slug} reviewId={r.id} reply={r.ownerReply} ownerName={data.name} isOwner={data.isOwner} />
                </div>
              </div>
            ))}
            {!data.isAuthed && data.reviews.length > 3 && (
              <div className="py-4 text-center text-sm text-gray-500">
                <Link href="/auth/signin" className="font-semibold text-brand hover:underline">Sign in</Link> to read all {data.ratingCount} reviews.
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

// Owner reply beneath a review. Shows the reply if present; the owner can add or
// edit it inline.
function OwnerReply({ slug, reviewId, reply, ownerName, isOwner }: { slug: string; reviewId: string; reply: string | null; ownerName: string; isOwner: boolean }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(reply ?? "")
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      const r = await replyReviewAction(slug, reviewId, text)
      if (r.ok) { setEditing(false); router.refresh() }
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <div className="mt-2 rounded-[4px] border border-gray-200 bg-gray-50 p-3">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={1000} placeholder={`Reply as ${ownerName}…`} className={`w-full ${R_EL} border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-brand`} />
        <div className="mt-2 flex gap-2">
          <button onClick={save} disabled={busy} className={`${R_EL} bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50`}>{busy ? "Saving…" : "Reply"}</button>
          <button onClick={() => { setEditing(false); setText(reply ?? "") }} className={`${R_EL} border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50`}>Cancel</button>
        </div>
      </div>
    )
  }

  if (reply) {
    return (
      <div className="mt-2 rounded-[4px] border-l-2 border-brand bg-brand-50/40 py-2 pl-3 pr-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-brand"><CornerDownRight className="h-3.5 w-3.5" /> {ownerName} · Owner</div>
        <p className="mt-0.5 whitespace-pre-line text-sm text-gray-700">{reply}</p>
        {isOwner && <button onClick={() => setEditing(true)} className="mt-1 text-xs font-medium text-gray-400 hover:text-brand">Edit reply</button>}
      </div>
    )
  }

  if (isOwner) {
    return <button onClick={() => setEditing(true)} className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-brand hover:underline"><CornerDownRight className="h-3.5 w-3.5" /> Reply</button>
  }
  return null
}

// Page updates. Owner gets a composer; everyone sees the timeline.
function PostsTab({ data }: { data: BusinessViewData }) {
  const router = useRouter()
  const [body, setBody] = useState("")
  const [imageKey, setImageKey] = useState<string | null | undefined>(undefined)
  const [uploaderKey, setUploaderKey] = useState(0) // bump to reset the uploader after posting
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function post() {
    if (!body.trim() && !imageKey) return
    setBusy(true)
    setErr(null)
    try {
      const r = await createPostAction(data.slug, body, imageKey ?? null)
      if (r.ok) {
        setBody("")
        setImageKey(undefined)
        setUploaderKey((k) => k + 1)
        router.refresh()
      } else setErr(r.error ?? "Failed to post.")
    } catch {
      setErr("Failed to post.")
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    await deletePostAction(data.slug, id)
    router.refresh()
  }

  const avatar = data.logoUrl

  return (
    <div className="flex flex-col gap-[18px]">
      {data.isOwner && (
        <Card>
          <SectionTitle>Share an update</SectionTitle>
          <div className="px-7 pb-6 pt-2">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={3000} placeholder="Post an update, offer, or news…" className={`w-full ${R_EL} border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-brand`} />
            <div className="mt-3">
              <BusinessImageUploader key={uploaderKey} label="Photo (optional)" shape="wide" initialUrl={null} onChange={setImageKey} />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button onClick={post} disabled={busy || (!body.trim() && !imageKey)} className={`${R_EL} bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-600 disabled:opacity-50`}>{busy ? "Posting…" : "Post"}</button>
              {err && <span className="text-xs font-medium text-red-500">{err}</span>}
            </div>
          </div>
        </Card>
      )}

      {data.posts.length === 0 ? (
        <Card><div className="px-7 py-12 text-center text-sm text-gray-400">{data.isOwner ? "No updates yet — share your first." : "No updates yet."}</div></Card>
      ) : (
        data.posts.map((p) => (
          <Card key={p.id}>
            <div className="flex items-start gap-3 px-6 pt-5">
              {avatar ? (
                <Image src={avatar} alt={data.name} width={40} height={40} className="h-10 w-10 rounded-[4px] object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-brand-50 text-brand"><Building2 className="h-5 w-5" /></div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-gray-900">{data.name}</div>
                <div className="text-xs text-gray-400">{p.timeLabel}</div>
              </div>
              {data.isOwner && (
                <button onClick={() => remove(p.id)} aria-label="Delete post" title="Delete" className="text-gray-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
            <p className="whitespace-pre-line px-6 pb-3 pt-3 text-[14px] leading-relaxed text-gray-800">{p.body}</p>
            {p.imageUrl && <Image src={p.imageUrl} alt="" width={0} height={0} sizes="100vw" className="max-h-[420px] w-full object-cover" />}
            <div className="pb-5" />
          </Card>
        ))
      )}
    </div>
  )
}
