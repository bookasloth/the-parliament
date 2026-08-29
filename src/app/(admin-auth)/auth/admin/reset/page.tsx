import type { Metadata } from "next"
import { AdminResetForm } from "./reset-form"

export const metadata: Metadata = {
  title: "Admin Password Reset · NNAWCA",
  robots: { index: false, follow: false },
}

export default function AdminResetPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[6px] bg-gradient-to-br from-blue-500 to-blue-700 text-lg font-bold text-white">
          N
        </div>
        <h1 className="text-lg font-bold text-gray-900">Reset admin password</h1>
        <p className="mt-1 text-sm text-gray-500">We email a one-time code to the owner recovery address.</p>
      </div>

      <div className="rounded-[6px] border border-gray-200 bg-white p-6">
        <AdminResetForm />
      </div>

      <p className="mt-4 text-center text-xs text-gray-400">
        Remembered it?{" "}
        <a href="/auth/admin" className="text-gray-600 underline hover:text-gray-800">
          Back to sign-in
        </a>
      </p>
    </div>
  )
}
