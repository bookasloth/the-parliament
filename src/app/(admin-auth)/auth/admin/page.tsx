import type { Metadata } from "next"
import { AdminLoginForm } from "./form"

export const metadata: Metadata = {
  title: "Admin Sign-in · NNAWCA",
  robots: { index: false, follow: false }, // keep the admin door out of search
}

export default function AdminLoginPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[6px] bg-gradient-to-br from-blue-500 to-blue-700 text-lg font-bold text-white">
          N
        </div>
        <h1 className="text-lg font-bold text-zinc-100">Admin Console</h1>
        <p className="mt-1 text-sm text-zinc-500">Staff sign-in — NNAWCA back office</p>
      </div>

      <div className="rounded-[6px] border border-zinc-800 bg-[#111113] p-6">
        <AdminLoginForm />
      </div>

      <p className="mt-4 text-center text-xs text-zinc-600">
        Not an admin? Head to the{" "}
        <a href="/auth/signin" className="text-zinc-400 underline hover:text-zinc-200">
          member sign-in
        </a>
        .
      </p>
    </div>
  )
}
