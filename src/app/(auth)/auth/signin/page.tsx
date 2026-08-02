import { AuthActions, AuthHeading, AuthFooterNote } from "../ui";
import { SignInForm } from "./form";

export default function SignInPage() {
  return (
    <>
      <AuthActions ghostLabel="Not a Member? Register." ghostHref="/auth/signup" />
      <div className="m-auto w-full max-w-xl">
        <AuthHeading title="Welcome Back, Navodian" />
        <div className="mt-8">
          <SignInForm />
        </div>
        <AuthFooterNote />
      </div>
    </>
  );
}
