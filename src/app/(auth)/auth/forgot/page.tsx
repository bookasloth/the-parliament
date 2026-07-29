import { ForgotForm } from "./form"

export default function ForgotPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Reset password</h1>
          <p className="text-muted-foreground text-sm">
            We&apos;ll email you a link to set a new password
          </p>
        </div>
        <ForgotForm />
      </div>
    </div>
  )
}
