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
    <section className="py-20 lg:py-28 bg-brand-50/20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-brand">
            Alumni Business Showcase
          </h2>
          <p className="mt-4 text-base text-charcoal-400 max-w-2xl mx-auto">
            Support businesses run by your fellow Navodayans
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {businesses.map((biz, i) => (
            <motion.div
              key={biz.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="group rounded-xl bg-white card-shadow hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden flex"
            >
              {/* Left 30% - Photo */}
              <div className="w-[30%] flex-shrink-0 overflow-hidden bg-gray-50">
                <img
                  src={biz.logo}
                  alt={biz.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Right 70% - Content */}
              <div className="w-[70%] p-4 flex flex-col justify-between min-h-0">
                <div>
                  <h3 className="font-bold text-sm text-gray-900 leading-snug">{biz.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
                    {biz.bio}
                  </p>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-400">
                    by <span className="font-medium text-gray-600">{biz.founder}</span>
                  </p>
                  <a
                    href={biz.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-600 transition-colors"
                  >
                    Visit <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded border border-gray-200 bg-white px-7 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
          >
            Explore All Businesses
          </a>
        </div>
      </div>
    </section>
  );
}
