"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { Testimonial } from "@/lib/homepage-data";

const houseColors: Record<string, string> = {
  Aravali: "#5a9bd5",
  Nilgiri: "#70ad47",
  Shiwalik: "#e8503a",
  Udaigiri: "#ffe135",
  Indira: "#ff9933",
  Laxmi: "#e75480",
};

interface TestimonialsProps {
  testimonials?: Testimonial[];
}

export function Testimonials({ testimonials = [] }: TestimonialsProps) {
  if (testimonials.length === 0) return null;

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy-500">
            What Alumni Say
          </h2>
          <p className="mt-4 text-base text-charcoal-400 max-w-2xl mx-auto">
            Real voices from the JNV Nagpur community
          </p>
        </div>

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
          {testimonials.map((t, i) => {
            const hc = houseColors[t.house] || "#1a3a6b";
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="break-inside-avoid rounded-[20px] bg-white p-6 card-shadow hover:shadow-lg transition-all duration-300 border border-charcoal-100"
              >
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${
                        s < t.rating
                          ? "fill-amber-400 text-amber-400"
                          : "fill-charcoal-100 text-charcoal-100"
                      }`}
                    />
                  ))}
                </div>

                <p className="text-sm text-charcoal-500 leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </p>

                <div className="mt-5 flex items-center gap-3">
                  <img
                    src={t.image}
                    alt={t.name}
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                    loading="lazy"
                  />
                  <div>
                    <p className="text-sm font-bold text-charcoal-800">{t.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-charcoal-400">{t.batch}</span>
                      <span className="text-[10px] text-charcoal-300">•</span>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: hc }}
                      >
                        {t.house}
                      </span>
                    </div>
                    <p className="text-[11px] text-charcoal-400 mt-0.5">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
