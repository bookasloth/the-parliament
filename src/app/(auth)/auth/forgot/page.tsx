import { ForgotForm } from "./form"

export default function ForgotPage() {
  return (
    <div className="m-auto w-full max-w-sm space-y-6">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#009ae4]">Recover</p>
        <h1 className="font-heading text-2xl font-bold text-charcoal-800">Reset password</h1>
        <p className="mt-1 text-sm text-gray-500">
          We&apos;ll email you a link to set a new password
        </p>
      </div>
      <ForgotForm />
    </div>
  )
}
