"use client"

import { useActionState } from "react"
import { CheckCircle2, Send } from "lucide-react"
import { submitEnquiry, type EnquiryState } from "./actions"

const initial: EnquiryState = { ok: false }

const inputCls =
  "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-[#1a1a1a] outline-none transition placeholder:text-[#a3a3a3] focus:border-brand focus:ring-2 focus:ring-brand/20"

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitEnquiry, initial)

  if (state.ok) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-[#70ad47]/30 bg-[#eef6e8] p-10 text-center">
        <CheckCircle2 className="h-12 w-12 text-[#70ad47]" />
        <h3 className="mt-4 font-heading text-xl font-semibold text-[#1a1a1a]">
          Message sent.
        </h3>
        <p className="mt-2 max-w-sm text-[15px] text-[#5b5b5b]">
          Thanks for reaching out — the committee will get back to you within a day or two.
        </p>
      </div>
    )
  }

  return (
    <form
      action={formAction}
      className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-8"
    >
      {/* honeypot */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        className="absolute left-[-9999px] h-0 w-0"
        aria-hidden
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[#3a3a3a]">Name</span>
          <input name="name" required placeholder="Your name" className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[#3a3a3a]">Email</span>
          <input name="email" type="email" required placeholder="you@email.com" className={inputCls} />
        </label>
      </div>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-medium text-[#3a3a3a]">Subject</span>
        <input name="subject" placeholder="What's this about?" className={inputCls} />
      </label>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-medium text-[#3a3a3a]">Message</span>
        <textarea
          name="message"
          required
          rows={5}
          placeholder="Tell us how we can help…"
          className={`${inputCls} resize-y`}
        />
      </label>

      {state.error && (
        <p className="mt-3 text-sm text-[#e8503a]">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  )
}
