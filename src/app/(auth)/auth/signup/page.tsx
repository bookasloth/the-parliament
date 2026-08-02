import { SignupCard } from "@/components/homepage/SignupCard";
import { AuthActions, AuthFooterNote } from "../ui";

// Exact same card as the homepage right panel.
export default function SignUpPage() {
  return (
    <>
      <AuthActions ghostLabel="Already Member? Login" ghostHref="/auth/signin" />
      <div className="m-auto w-full max-w-xl">
        <SignupCard />
        <AuthFooterNote />
      </div>
    </>
  );
}
