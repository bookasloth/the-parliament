"use client"

import { signIn, signOut, getSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState, Suspense, FormEvent } from "react"

type Phase = "login" | "password" | "auth" | "done" | "denied"

const BOOT = [
  "NNAWCA secure shell v1.0",
  "(c) Nagpur Navodaya Alumni Welfare & Charitable Association",
  "",
  "Authorized personnel only. All access is logged.",
  "",
]

function TerminalInner() {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get("callbackUrl") || "/admin"

  const [phase, setPhase] = useState<Phase>("login")
  const [email, setEmail] = useState("")
  const [value, setValue] = useState("") // current input buffer
  const [lines, setLines] = useState<string[]>(BOOT)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [phase])

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [lines])

  const print = (...l: string[]) => setLines((prev) => [...prev, ...l])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    const entry = value
    setValue("")

    if (phase === "login") {
      if (!entry.trim()) return
      print(`login: ${entry}`)
      setEmail(entry.trim())
      setPhase("password")
      return
    }

    if (phase === "password") {
      print("password: " + "*".repeat(entry.length))
      setPhase("auth")
      print("authenticating…")

      const result = await signIn("credentials", {
        email,
        password: entry,
        redirect: false,
      })

      if (result?.error) {
        print("ACCESS DENIED — invalid credentials.", "")
        setPhase("login")
        return
      }

      // Credentials passed. Now enforce admin-only: this shell is not for members.
      const session = await getSession()
      if (!session?.user?.isAdmin) {
        await signOut({ redirect: false })
        print("ACCESS DENIED — account is not an administrator.", "")
        setPhase("login")
        setEmail("")
        return
      }

      print("access granted.", "opening console…")
      setPhase("done")
      router.push(callbackUrl)
      router.refresh()
    }
  }

  const prompt = phase === "password" ? "password:" : "login:"
  const masked = phase === "password" ? "*".repeat(value.length) : value
  const busy = phase === "auth" || phase === "done"

  return (
    <div
      className="flex min-h-[100dvh] items-start justify-center bg-black px-4 py-8 font-mono text-[13px] leading-relaxed text-emerald-400 selection:bg-emerald-400 selection:text-black"
      onClick={() => inputRef.current?.focus()}
    >
      <div ref={scrollRef} className="w-full max-w-2xl overflow-y-auto">
        {lines.map((l, i) => (
          <div key={i} className="whitespace-pre-wrap">{l || " "}</div>
        ))}

        {!busy && (
          <div className="flex whitespace-pre-wrap">
            <span>{prompt}&nbsp;</span>
            <span>{masked}</span>
            <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-emerald-400" />
          </div>
        )}

        {/* Off-screen real input drives the fake caret above. Native form submit
            handles Enter reliably (single-input form). */}
        <form onSubmit={submit}>
          <input
            ref={inputRef}
            type={phase === "password" ? "password" : "text"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={busy}
            autoComplete={phase === "password" ? "current-password" : "username"}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="absolute -left-[9999px] h-px w-px opacity-0"
            aria-label={phase === "password" ? "password" : "email"}
          />
        </form>
      </div>
    </div>
  )
}

export default function TerminalLoginPage() {
  return (
    <Suspense>
      <TerminalInner />
    </Suspense>
  )
}
