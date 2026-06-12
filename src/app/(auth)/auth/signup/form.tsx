"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
      return;
    }

    router.push("/auth/signin");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>
      )}
      <div>
        <label htmlFor="name" className="text-sm font-medium">
          Full Name
        </label>
        <input
          id="name"
          name="name"
          required
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
        />
      </div>
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
        Create Account
      </button>
      <p className="text-center text-xs text-gray-500">
        Already have an account?{" "}
        <a href="/auth/signin" className="text-blue-600 hover:underline">
          Sign in
        </a>
      </p>
    </form>
  );
}
