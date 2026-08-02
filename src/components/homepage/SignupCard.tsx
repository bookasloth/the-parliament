"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 1986–1993 through 2025–2032.
const batchOptions = Array.from({ length: 40 }, (_, i) => {
  const start = 1986 + i;
  const end = start + 7;
  return { value: `${start}-${end}`, label: `${start}–${end}` };
});

// House buttons show the house name, and its patron on hover. Backgrounds
// darkened so text clears WCAG AA in every state.
const houseButtons = [
  { id: "aravali", name: "Aravali", hoverText: "Jawahar", defaultBg: "#2e6da4", hoverBg: "#255a87", activeBg: "#1e4a70", textColor: "#ffffff" },
  { id: "nilgiri", name: "Nilgiri", hoverText: "Tilak", defaultBg: "#3a6b23", hoverBg: "#30591d", activeBg: "#274a18", textColor: "#ffffff" },
  { id: "shiwalik", name: "Shiwalik", hoverText: "Subhash", defaultBg: "#a53422", hoverBg: "#8f2c1d", activeBg: "#7a2518", textColor: "#ffffff" },
  { id: "udaigiri", name: "Udaigiri", hoverText: "Rajiv", defaultBg: "#ffe135", hoverBg: "#ffda03", activeBg: "#edc001", textColor: "#000000" },
  { id: "indira", name: "Indira", hoverText: "Indira", defaultBg: "#ff9933", hoverBg: "#e67e22", activeBg: "#cc7000", textColor: "#000000" },
  { id: "laxmi", name: "Laxmi", hoverText: "Laxmi", defaultBg: "#b82055", hoverBg: "#a01c49", activeBg: "#87173d", textColor: "#ffffff" },
];

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-sm outline-none transition-all focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10";

export function SignupCard() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [house, setHouse] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email: email.trim(), password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }
    router.push("/auth/signin");
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
          <label htmlFor="signup-batch" className="mb-1.5 block text-sm font-bold text-charcoal-800">Batch (7 Years)</label>
          <select id="signup-batch" aria-label="Batch" defaultValue="" className={`${inputCls} appearance-none`}>
            <option value="" disabled>Select your batch</option>
            {batchOptions.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-bold text-charcoal-800">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password (min 8 characters)" minLength={8} required autoComplete="new-password" className={inputCls} />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-bold text-charcoal-800">Select House</label>
          <div className="grid grid-cols-3 gap-3">
            {houseButtons.map((h) => {
              const active = house === h.id;
              const hov = hovered === h.id;
              const bg = active ? h.activeBg : hov ? h.hoverBg : h.defaultBg;
              return (
                <button
                  key={h.id}
                  type="button"
                  onMouseEnter={() => setHovered(h.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setHouse(active ? null : h.id)}
                  className="w-full truncate rounded-xl px-3 py-3 text-sm font-semibold outline-none transition-all"
                  style={{
                    backgroundColor: bg,
                    color: h.textColor,
                    boxShadow: active ? "inset 0 0 0 2px rgba(0,0,0,0.35)" : "none",
                  }}
                >
                  {hov ? h.hoverText : h.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-8 w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-brand-600 hover:shadow-lg disabled:opacity-60"
      >
        {loading ? "Creating account…" : "Register at NNAWCA"}
      </button>
    </form>
  );
}
