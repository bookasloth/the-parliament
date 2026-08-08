"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

const CODE_LEN = 5

export function VerifyClient() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get("token")
  const email = params.get("email") ?? ""

  // Legacy email-link path: ?token present → consume it, then bounce to sign in.
  const [linkState, setLinkState] = useState<"idle" | "verifying" | "error">(token ? "verifying" : "idle")
  const started = useRef(false)
  useEffect(() => {
    if (!token || started.current) return
    started.current = true
    fetch("/api/auth/verify-email", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }),
    }).then((r) => {
      if (r.ok) router.replace("/auth/signin?verified=1")
      else setLinkState("error")
    }).catch(() => setLinkState("error"))
  }, [token, router])

  const [code, setCode] = useState<string[]>(Array(CODE_LEN).fill(""))
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [resent, setResent] = useState(false)
  const boxes = useRef<(HTMLInputElement | null)[]>([])

  function setChar(i: number, v: string) {
    const c = v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(-1)
    const nextArr = [...code]
    nextArr[i] = c
    setCode(nextArr)
    if (c && i < CODE_LEN - 1) boxes.current[i + 1]?.focus()
  }
  function onKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[i] && i > 0) boxes.current[i - 1]?.focus()
  }
  function onPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, CODE_LEN)
    if (!text) return
    e.preventDefault()
    const arr = Array(CODE_LEN).fill("")
    for (let i = 0; i < text.length; i++) arr[i] = text[i]
    setCode(arr)
    boxes.current[Math.min(text.length, CODE_LEN - 1)]?.focus()
  }

  async function submit() {
    const value = code.join("")
    if (value.length < CODE_LEN) { setError("Enter all 5 characters"); return }
    if (!email) { setError("Missing email — sign up again"); return }
    setError(""); setBusy(true)
    const res = await fetch("/api/auth/verify-code", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code: value }),
    })
    setBusy(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? "Invalid or expired code")
      return
    }
    router.replace(`/auth/signin?verified=1&email=${encodeURIComponent(email)}`)
  }

  async function resend() {
    if (!email) return
    setError(""); setResent(false)
    await fetch("/api/auth/verify-code", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, resend: true }),
    })
    setResent(true)
  }

  if (token) {
    return linkState === "error"
      ? <p className="text-sm text-red-600">This link is invalid or has expired. <a href="/auth/forgot" className="font-semibold text-brand hover:underline">Request a new one</a>.</p>
      : <p className="text-sm text-gray-500">Confirming your email…</p>
  }

  return (
    <div>
      <p className="text-sm text-gray-500">
        {email ? <>We sent a 5-character code to <span className="font-semibold text-charcoal-800">{email}</span>. Enter it below.</>
               : "Enter the 5-character code from your email."}
      </p>

      <div className="mt-6 flex gap-2.5" onPaste={onPaste}>
        {Array.from({ length: CODE_LEN }).map((_, i) => (
          <input
            key={i}
            ref={(el) => { boxes.current[i] = el }}
            value={code[i]}
            onChange={(e) => setChar(i, e.target.value)}
            onKeyDown={(e) => onKey(i, e)}
            inputMode="text"
            maxLength={1}
            className="h-14 w-full rounded-[5px] border border-gray-300 text-center text-xl font-bold uppercase outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
          />
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {resent && <p className="mt-3 text-sm text-green-600">A new code is on its way.</p>}

      <button
        onClick={submit} disabled={busy}
        className="mt-6 w-full rounded-[5px] bg-brand py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-brand-600 disabled:opacity-60"
      >
        {busy ? "Verifying…" : "Verify and continue"}
      </button>

      <p className="mt-4 text-center text-sm text-gray-500">
        Didn&rsquo;t get it? <button onClick={resend} className="font-semibold text-brand hover:underline">Resend code</button>
      </p>
    </div>
  )
}
