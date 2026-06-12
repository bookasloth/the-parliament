"use client";

import { useState } from "react";
import Link from "next/link";
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
      className="card-shadow rounded-[20px] bg-white w-full max-w-[880px] mx-auto overflow-hidden flex flex-col md:flex-row"
    >
      <div
        className="md:w-[38%] min-h-[220px] md:min-h-[520px] bg-cover bg-center relative flex items-end"
        style={{
          backgroundImage: "url(https://images.unsplash.com/photo-1523050854058-8df90110c7f1?w=600&h=800&fit=crop)",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 via-navy-900/30 to-transparent" />
        <div className="relative p-6 md:p-8 text-white">
          <h2 className="text-2xl md:text-3xl font-extrabold leading-tight">
            Welcome to the NNAWCA!
          </h2>
          <p className="mt-2 text-sm text-white/80 leading-relaxed">
            Reconnect, reminisce, and rediscover your Navodaya family.
          </p>
        </div>
      </div>

      <div className="flex-1 p-6 md:p-8">
        <div className="mb-6">
          <Link href="/" className="text-xs text-charcoal-400 hover:text-brand transition-colors">
            Homepage
          </Link>
          <span className="text-xs text-charcoal-300 mx-1">\</span>
          <span className="text-xs font-semibold text-charcoal-600">
            Create a Free NNAWCA Account
          </span>
        </div>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="block text-xs font-semibold text-charcoal-600 mb-1.5">Name</label>
            <input
              type="text"
              placeholder="Your full name"
              className="w-full rounded-xl border border-charcoal-200 bg-white py-2.5 px-4 text-sm font-body outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-600 mb-1.5">Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-xl border border-charcoal-200 bg-white py-2.5 px-4 text-sm font-body outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-600 mb-1.5">
              Select Your Batch (7 Years)
            </label>
            <select className="w-full rounded-xl border border-charcoal-200 bg-white py-2.5 px-4 text-sm font-body outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10 text-charcoal-500 appearance-none">
              <option value="" disabled selected>Select your batch</option>
              {batchOptions.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-600 mb-1.5">Select House</label>
            <div className="flex flex-wrap gap-2">
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
                    onClick={() =>
                      setSelectedHouse(selectedHouse === btn.id ? null : btn.id)
                    }
                    className="rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 border-0 outline-none ring-0"
                    style={{
                      backgroundColor: bg,
                      color: btn.textColor,
                    }}
                  >
                    {isHovered ? btn.hoverText : btn.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full rounded-full bg-brand py-3 text-sm font-bold text-white hover:brightness-110 transition-all shadow-md hover:shadow-lg"
            >
              Register at NNAWCA
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-xs text-charcoal-400">
          By continuing, you agree to{" "}
          <a href="#" className="text-brand underline underline-offset-2 hover:brightness-110">
            Terms
          </a>{" "}
          &{" "}
          <a href="#" className="text-brand underline underline-offset-2 hover:brightness-110">
            Privacy Policy
          </a>
        </p>
      </div>
    </motion.div>
  );
}
