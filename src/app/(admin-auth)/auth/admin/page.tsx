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
        <h1 className="text-lg font-bold text-gray-900">Admin Console</h1>
        <p className="mt-1 text-sm text-gray-500">Staff sign-in — NNAWCA back office</p>
      </div>

      <div className="rounded-[6px] border border-gray-200 bg-white p-6">
        <AdminLoginForm />
      </div>

      <p className="mt-4 text-center text-xs text-gray-400">
        Not an admin? Head to the{" "}
        <a href="/auth/signin" className="text-gray-600 underline hover:text-gray-800">
          member sign-in
        </a>
        .
      </p>
    </div>
  )
}
