import { SignUpForm } from "./form";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">The Parliament</h1>
          <p className="text-muted-foreground text-sm">
            Join JNV Nagpur Alumni Network
          </p>
        </div>
        <SignUpForm />
      </div>
    </div>
  );
}
