"use client";

import { motion } from "framer-motion";
import {
  Users,
  Briefcase,
  Store,
  Calendar,
  GraduationCap,
  HeartHandshake,
} from "lucide-react";
import type { WhyJoinCard } from "@/lib/homepage-data";

const iconMap: Record<string, React.ElementType> = {
  users: Users,
  briefcase: Briefcase,
  store: Store,
  calendar: Calendar,
  "graduation-cap": GraduationCap,
  "heart-handshake": HeartHandshake,
};

const bgStyles = [
  "from-red-50 to-red-100 text-red-600 group-hover:bg-red-600",
  "from-blue-50 to-blue-100 text-blue-600 group-hover:bg-blue-600",
  "from-orange-50 to-orange-100 text-orange-600 group-hover:bg-orange-600",
  "from-green-50 to-green-100 text-green-600 group-hover:bg-green-600",
  "from-purple-50 to-purple-100 text-purple-600 group-hover:bg-purple-600",
  "from-amber-50 to-amber-100 text-amber-600 group-hover:bg-amber-600",
];

interface WhyJoinProps {
  cards?: WhyJoinCard[];
}

export function WhyJoin({ cards = [] }: WhyJoinProps) {
  if (cards.length === 0) return null;

  return (
    <section className="py-20 lg:py-28 bg-navy-50/20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy-500">
            Why Join NNAWCA
          </h2>
          <p className="mt-4 text-base text-charcoal-400 max-w-2xl mx-auto">
            This isn&apos;t just another alumni directory. This is your tribe, your network, your legacy.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, i) => {
            const Icon = iconMap[card.icon] || Users;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group rounded-[20px] bg-white p-7 card-shadow hover:shadow-lg transition-all duration-300 relative overflow-hidden"
              >
                <div
                  className="absolute top-0 right-0 w-24 h-24 rounded-bl-[40px] opacity-[0.04] bg-gradient-to-br transition-all duration-500 group-hover:opacity-[0.08]"
                  style={{
                    background: `linear-gradient(135deg, ${["#DC2626","#2563EB","#EA580C","#16A34A","#D946EF","#F59E0B"][i]}, transparent)`,
                  }}
                />
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${bgStyles[i]} group-hover:text-white transition-all duration-300`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-charcoal-800">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm text-charcoal-400 leading-relaxed">
                  {card.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
