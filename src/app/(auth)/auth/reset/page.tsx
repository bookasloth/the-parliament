import { ResetForm } from "./form"

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Set a new password</h1>
          <p className="text-muted-foreground text-sm">Choose a password for your account</p>
        </div>
        <ResetForm token={token ?? ""} />
      </div>
    </div>
  )
}
