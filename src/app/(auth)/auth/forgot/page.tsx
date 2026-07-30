import { ForgotForm } from "./form"

export default function ForgotPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#009ae4]">Recover</p>
        <h1 className="font-heading text-2xl font-bold text-white">Reset password</h1>
        <p className="mt-1 text-sm text-neutral-400">
          We&apos;ll email you a link to set a new password
        </p>
      </div>
      <ForgotForm />
    </div>
  )
}
