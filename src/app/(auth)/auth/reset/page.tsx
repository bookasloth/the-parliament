import { ResetForm } from "./form"

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#009ae4]">Almost there</p>
        <h1 className="font-heading text-2xl font-bold text-white">Set a new password</h1>
        <p className="mt-1 text-sm text-neutral-400">Choose a password for your account</p>
      </div>
      <ResetForm token={token ?? ""} />
    </div>
  )
}
