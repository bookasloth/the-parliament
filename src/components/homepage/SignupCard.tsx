"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 1986–1993 through 2025–2032.
const batchOptions = Array.from({ length: 40 }, (_, i) => {
  const start = 1986 + i;
  const end = start + 7;
  return { value: `${start}-${end}`, label: `${start}–${end}` };
});

// Girls-only houses default their gender to Female (still overridable).
const FEMALE_HOUSES = new Set(["btn-5", "btn-6"]); // Indira, Laxmi

interface HouseBtn {
  id: string;
  name: string;
  hoverText: string;
  defaultBg: string;
  hoverBg: string;
  activeBg: string;
  textColor: string;
}

// Backgrounds darkened so text clears WCAG AA (4.5:1) in every state. House hues
// kept; only lightness dropped. Udaigiri/Indira use black text (vivid on yellow/
// orange). ponytail: revert to the brighter shades if the palette matters more
// than the contrast audit.
const houseButtons: HouseBtn[] = [
  { id: "btn-1", name: "Aravali", hoverText: "Jawahar", defaultBg: "#2e6da4", hoverBg: "#255a87", activeBg: "#1e4a70", textColor: "#ffffff" },
  { id: "btn-2", name: "Nilgiri", hoverText: "Tilak", defaultBg: "#3a6b23", hoverBg: "#30591d", activeBg: "#274a18", textColor: "#ffffff" },
  { id: "btn-3", name: "Shiwalik", hoverText: "Subhash", defaultBg: "#a53422", hoverBg: "#8f2c1d", activeBg: "#7a2518", textColor: "#ffffff" },
  { id: "btn-4", name: "Udaigiri", hoverText: "Rajiv", defaultBg: "#ffe135", hoverBg: "#ffda03", activeBg: "#edc001", textColor: "#000000" },
  { id: "btn-5", name: "Indira", hoverText: "Indira", defaultBg: "#ff9933", hoverBg: "#e67e22", activeBg: "#cc7000", textColor: "#000000" },
  { id: "btn-6", name: "Laxmi", hoverText: "Laxmi", defaultBg: "#b82055", hoverBg: "#a01c49", activeBg: "#87173d", textColor: "#ffffff" },
];

export function SignupCard() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [genderTouched, setGenderTouched] = useState(false);
  const [selectedHouse, setSelectedHouse] = useState<string | null>(null);
  const [hoveredHouse, setHoveredHouse] = useState<string | null>(null);

  function pickHouse(id: string) {
    const next = selectedHouse === id ? null : id;
    setSelectedHouse(next);
    // Default (don't force) gender for girls-only houses until the user sets it.
    if (next && FEMALE_HOUSES.has(next) && !genderTouched) setGender("female");
  }

  // The hero card can't complete signup on its own (no password + email
  // verification here), so hand off to the real /auth/signup flow, prefilled.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qs = new URLSearchParams();
    if (name.trim()) qs.set("name", name.trim());
    if (email.trim()) qs.set("email", email.trim());
    const q = qs.toString();
    router.push(q ? `/auth/signup?${q}` : "/auth/signup");
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-xl shadow-brand/5 w-full mx-auto overflow-hidden">
      <div className="p-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </div>

          <div>
            <label htmlFor="signup-batch" className="block text-xs font-semibold text-gray-700 mb-1">Batch (7 Years)</label>
            <select id="signup-batch" aria-label="Batch (7 Years)" defaultValue="" className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10 text-gray-500 appearance-none">
              <option value="" disabled>Select your batch</option>
              {batchOptions.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">House</label>
            <div className="grid grid-cols-3 gap-2">
              {houseButtons.map((btn) => {
                const isActive = selectedHouse === btn.id;
                const isHovered = hoveredHouse === btn.id;
                let bg = btn.defaultBg;
                if (isActive) bg = btn.activeBg;
                else if (isHovered) bg = btn.hoverBg;

                return (
                  <button
                    key={btn.id}
                    type="button"
                    onMouseEnter={() => setHoveredHouse(btn.id)}
                    onMouseLeave={() => setHoveredHouse(null)}
                    onClick={() => pickHouse(btn.id)}
                    className="rounded px-2 py-2.5 text-xs font-semibold transition-all duration-200 outline-none w-full truncate"
                    style={{
                      backgroundColor: bg,
                      color: btn.textColor,
                      // 1px grey ring on the selected house; box-shadow avoids the
                      // border-width/transition-all interaction and keeps layout stable.
                      boxShadow: isActive ? "inset 0 0 0 1px #9ca3af" : "none",
                    }}
                  >
                    {isHovered ? btn.hoverText : btn.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="signup-gender" className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
            <select
              id="signup-gender"
              aria-label="Gender"
              value={gender}
              onChange={(e) => { setGender(e.target.value); setGenderTouched(true); }}
              className={`w-full rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10 appearance-none ${gender ? "text-gray-900" : "text-gray-500"}`}
            >
              <option value="" disabled>Select your gender</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full rounded bg-brand py-2.5 text-sm font-bold text-white hover:bg-brand-600 transition-all shadow-md hover:shadow-lg"
          >
            Register at NNAWCA
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          By continuing, you agree to{" "}
          <a href="/terms" className="text-brand underline underline-offset-2 hover:text-brand-600">Terms</a>
          {" & "}
          <a href="/privacy" className="text-brand underline underline-offset-2 hover:text-brand-600">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
