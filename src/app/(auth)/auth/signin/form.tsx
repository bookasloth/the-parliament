"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);

    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>
      )}
      <div>
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Sign In
      </button>
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="w-full rounded border px-4 py-2 text-sm font-medium hover:bg-gray-50"
      >
        Continue with Google
      </button>
      <p className="text-center text-xs text-gray-500">
        No account?{" "}
        <a href="/auth/signup" className="text-blue-600 hover:underline">
          Sign up
        </a>
      </p>
    </form>
  );
}
