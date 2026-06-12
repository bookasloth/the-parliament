"use client";

import { motion } from "framer-motion";
import type { AlumniCard } from "@/lib/homepage-data";

const houseColors: Record<string, string> = {
  Aravali: "#5a9bd5",
  Nilgiri: "#70ad47",
  Shiwalik: "#e8503a",
  Udaigiri: "#ffe135",
  Indira: "#ff9933",
  Laxmi: "#e75480",
};

interface FeaturedAlumniProps {
  alumni?: AlumniCard[];
}

export function FeaturedAlumni({ alumni = [] }: FeaturedAlumniProps) {
  if (alumni.length === 0) return null;

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy-500">
            Featured Alumni
          </h2>
          <p className="mt-4 text-base text-charcoal-400 max-w-2xl mx-auto">
            Pride of JNV Nagpur — making a difference across India and the world
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {alumni.map((person, i) => {
            const hc = houseColors[person.house] || "#1a3a6b";
            return (
              <motion.div
                key={person.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-[20px] bg-white card-shadow hover:shadow-lg transition-all duration-300 overflow-hidden border border-charcoal-100"
              >
                <div
                  className="h-2"
                  style={{ background: `linear-gradient(90deg, ${hc}, ${hc}88)` }}
                />
                <div className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div
                        className="h-16 w-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold"
                        style={{ background: `linear-gradient(135deg, ${hc}, ${hc}aa)` }}
                      >
                        {person.name.charAt(0)}
                      </div>
                      <div
                        className="absolute -bottom-1 -right-1 h-5 px-1.5 rounded-full text-[9px] font-bold text-white flex items-center justify-center border-2 border-white"
                        style={{ background: hc }}
                      >
                        {person.house}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-charcoal-800 truncate text-base">
                        {person.name}
                      </h3>
                      <p className="text-xs text-charcoal-400 font-medium">
                        {person.batch}
                      </p>
                      <p className="text-xs font-semibold text-charcoal-600 truncate mt-0.5">
                        {person.company}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="inline-flex items-center rounded-full bg-gold-50 px-3 py-1 text-xs font-semibold text-gold-600 border border-gold-100">
                      {person.achievement}
                    </span>
                    <span className="text-[10px] text-charcoal-300 font-medium">
                      ID: JNV-{person.id.padStart(4, "0")}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded-full border border-charcoal-200 bg-white px-7 py-3 text-sm font-semibold text-charcoal-600 hover:bg-charcoal-50 transition-all shadow-sm"
          >
            Explore Alumni Directory
          </a>
        </div>
      </div>
    </section>
  );
}
