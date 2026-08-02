"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 1986–1993 through 2025–2032.
const batchOptions = Array.from({ length: 40 }, (_, i) => {
  const start = 1986 + i;
  const end = start + 7;
  return { value: `${start}-${end}`, label: `${start}–${end}` };
});

const HOUSES = ["Aravali", "Nilgiri", "Shiwalik", "Udaigiri", "Indira", "Laxmi"];

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-sm outline-none transition-all focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10";

export function SignupCard() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  // The screen can't finish signup (no password / email verification here), so
  // hand off to the real /auth/signup flow, prefilled.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    const qs = new URLSearchParams();
    if (name) qs.set("name", name);
    if (email.trim()) qs.set("email", email.trim());
    const q = qs.toString();
    router.push(q ? `/auth/signup?${q}` : "/auth/signup");
  }

  return (
    <form className="w-full max-w-xl" onSubmit={handleSubmit}>
      <p className="text-2xl font-extrabold tracking-tight">
        <span className="text-brand">Homepage</span>
        <span className="text-gray-400"> {"\\\\"} </span>
        <span className="text-charcoal-800">Create a Free NNAWCA Account</span>
      </p>

      <div className="mt-8 grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-bold text-charcoal-800">Name</label>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className={inputCls} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-bold text-charcoal-800">Last Name</label>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className={inputCls} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-bold text-charcoal-800">Email Address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputCls} />
        </div>
        <div>
          <label htmlFor="signup-house" className="mb-1.5 block text-sm font-bold text-charcoal-800">House</label>
          <select id="signup-house" aria-label="House" defaultValue="" className={`${inputCls} appearance-none`}>
            <option value="" disabled>Select your house</option>
            {HOUSES.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="signup-batch" className="mb-1.5 block text-sm font-bold text-charcoal-800">Select Your Batch (7 Years)</label>
          <select id="signup-batch" aria-label="Batch" defaultValue="" className={`${inputCls} appearance-none`}>
            <option value="" disabled>Select your batch</option>
            {batchOptions.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="mt-8 w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-brand-600 hover:shadow-lg"
      >
        Register at NNAWCA
      </button>
    </form>
  );
}
