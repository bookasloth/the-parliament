import { SignInForm } from "./form";

export default function SignInPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#009ae4]">Sign in</p>
        <h1 className="font-heading text-2xl font-bold text-white">Welcome back</h1>
        <p className="mt-1 text-sm text-neutral-400">Sign in to the JNV Nagpur alumni network</p>
      </div>
      <SignInForm />
    </div>
  );
}
