import { Suspense } from "react"
import { AuthActions, AuthHeading, AuthFooterNote } from "../ui"
import { VerifyClient } from "./verify-client"

export default function VerifyEmailPage() {
  return (
    <>
      <AuthActions ghostLabel="Already Member? Login" ghostHref="/auth/signin" />
      <div className="m-auto w-full max-w-md">
        <AuthHeading title="Verify your email" />
        <div className="mt-8">
          <Suspense>
            <VerifyClient />
          </Suspense>
        </div>
        <AuthFooterNote />
      </div>
    </>
  )
}
