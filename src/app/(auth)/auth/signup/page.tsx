import { SignUpForm } from "./form";

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#ff4800]">Get started</p>
        <h1 className="font-heading text-2xl font-bold text-white">Create your account</h1>
        <p className="mt-1 text-sm text-neutral-400">Join the JNV Nagpur alumni network</p>
      </div>
      <SignUpForm />
    </div>
  );
}
