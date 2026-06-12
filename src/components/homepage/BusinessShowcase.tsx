"use client";

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import type { BusinessCard } from "@/lib/homepage-data";

interface BusinessShowcaseProps {
  businesses?: BusinessCard[];
}

export function BusinessShowcase({ businesses = [] }: BusinessShowcaseProps) {
  if (businesses.length === 0) return null;

  return (
    <section className="py-20 lg:py-28 bg-navy-50/20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy-500">
            Alumni Business Showcase
          </h2>
          <p className="mt-4 text-base text-charcoal-400 max-w-2xl mx-auto">
            Support businesses run by your fellow Navodayans
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {businesses.map((biz, i) => (
            <motion.a
              key={biz.id}
              href={biz.website}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group rounded-[20px] bg-white p-6 card-shadow hover:shadow-lg transition-all duration-300 flex flex-col items-center text-center"
            >
              <div className="h-20 w-20 rounded-2xl overflow-hidden mb-4 bg-charcoal-50 ring-1 ring-charcoal-100 group-hover:ring-navy-200 transition-all">
                <img
                  src={biz.logo}
                  alt={biz.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <h3 className="font-bold text-sm text-charcoal-800 group-hover:text-navy-500 transition-colors">
                {biz.name}
              </h3>
              <p className="text-xs text-charcoal-400 mt-0.5">by {biz.founder}</p>
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                <span className="rounded-full bg-charcoal-50 px-2.5 py-0.5 text-[10px] font-medium text-charcoal-500">
                  {biz.category}
                </span>
                <span className="rounded-full bg-charcoal-50 px-2.5 py-0.5 text-[10px] font-medium text-charcoal-500">
                  {biz.city}
                </span>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-navy-500 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                Visit <ExternalLink className="h-3 w-3" />
              </span>
            </motion.a>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded-full border border-charcoal-200 bg-white px-7 py-3 text-sm font-semibold text-charcoal-600 hover:bg-charcoal-50 transition-all shadow-sm"
          >
            Explore All Businesses
          </a>
        </div>
      </div>
    </section>
  );
}
