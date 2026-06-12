"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const batchOptions = Array.from({ length: 33 }, (_, i) => {
  const start = 1986 + i;
  const end = start + 7;
  return { value: `${start}-${end}`, label: `${start}–${end}` };
});

interface HouseBtn {
  id: string;
  name: string;
  hoverText: string;
  defaultBg: string;
  hoverBg: string;
  activeBg: string;
  textColor: string;
}

const houseButtons: HouseBtn[] = [
  { id: "btn-1", name: "Aravali", hoverText: "Jawahar", defaultBg: "#5a9bd5", hoverBg: "#428bca", activeBg: "#2e6da4", textColor: "#ffffff" },
  { id: "btn-2", name: "Nilgiri", hoverText: "Tilak", defaultBg: "#70ad47", hoverBg: "#5c9e3d", activeBg: "#447f2a", textColor: "#ffffff" },
  { id: "btn-3", name: "Shiwalik", hoverText: "Subhash", defaultBg: "#e8503a", hoverBg: "#c7432f", activeBg: "#a53422", textColor: "#ffffff" },
  { id: "btn-4", name: "Udaigiri", hoverText: "Rajiv", defaultBg: "#ffe135", hoverBg: "#ffda03", activeBg: "#edc001", textColor: "#000000" },
  { id: "btn-5", name: "Indira", hoverText: "Indira", defaultBg: "#ff9933", hoverBg: "#e67e22", activeBg: "#cc7000", textColor: "#ffffff" },
  { id: "btn-6", name: "Laxmi", hoverText: "Laxmi", defaultBg: "#e75480", hoverBg: "#d6336c", activeBg: "#b82055", textColor: "#ffffff" },
];

export function SignupCard() {
  const [selectedHouse, setSelectedHouse] = useState<string | null>(null);
  const [hoveredHouse, setHoveredHouse] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="rounded-2xl border border-gray-100 bg-white shadow-xl shadow-brand/5 w-full mx-auto overflow-hidden"
    >
      <div className="p-6">
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Name</label>
            <input
              type="text"
              placeholder="Your full name"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Batch (7 Years)</label>
            <select defaultValue="" className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10 text-gray-500 appearance-none">
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
                    onClick={() => setSelectedHouse(selectedHouse === btn.id ? null : btn.id)}
                    className="rounded px-2 py-2.5 text-xs font-semibold transition-all duration-200 border-0 outline-none ring-0 w-full truncate"
                    style={{ backgroundColor: bg, color: btn.textColor }}
                  >
                    {isHovered ? btn.hoverText : btn.name}
                  </button>
                );
              })}
            </div>
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
          <a href="#" className="text-brand underline underline-offset-2 hover:text-brand-600">Terms</a>
          {" & "}
          <a href="#" className="text-brand underline underline-offset-2 hover:text-brand-600">Privacy Policy</a>
        </p>
      </div>
    </motion.div>
  );
}
