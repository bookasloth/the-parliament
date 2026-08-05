"use client"

import { FormEvent, useState } from "react"
import { Mail } from "lucide-react"
import { Field, SubmitButton, FormSuccess } from "../ui"

export function ForgotForm() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email") }),
    })
    setLoading(false)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <FormSuccess>
          If that email is registered, a link to set your password is on its way. Check your inbox.
        </FormSuccess>
        <a href="/auth/signin" className="block text-center text-sm font-medium text-[#009ae4] hover:underline">
          Back to sign in
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Email" id="email" name="email" type="email" required autoComplete="email" icon={<Mail size={18} />} />
      <SubmitButton loading={loading} idleLabel="Send reset link" />
      <a href="/auth/signin" className="block text-center text-xs text-gray-500 hover:text-brand hover:underline">
        Back to sign in
      </a>
    </form>
  )
}
