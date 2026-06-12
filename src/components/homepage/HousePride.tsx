"use client";

import { motion } from "framer-motion";
import { Users, Gamepad2, Trophy, Store, HandCoins, Crown } from "lucide-react";
import type { House } from "@/lib/homepage-data";

function formatMoney(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

const houseInfo = [
  { label: "Members", icon: Users, key: "members" as const },
  { label: "Games Played", icon: Gamepad2, key: "gamesPlayed" as const },
  { label: "Tournaments Won", icon: Trophy, key: "tournamentsWon" as const },
  { label: "Businesses Listed", icon: Store, key: "businesses" as const },
  { label: "Money Donated", icon: HandCoins, key: "moneyDonated" as const, format: formatMoney },
  { label: "Paid Members", icon: Crown, key: "paidMembers" as const },
];

interface HousePrideProps {
  houses?: House[];
}

export function HousePride({ houses = [] }: HousePrideProps) {
  if (houses.length === 0) return null;

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-brand">
            House Pride
          </h2>
          <p className="mt-4 text-base text-charcoal-400 max-w-2xl mx-auto">
            Which house do you belong to?
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
          {houses.map((house, i) => (
            <motion.div
              key={house.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="rounded-[20px] bg-white card-shadow overflow-hidden group hover:shadow-lg transition-all duration-300"
            >
              <div className="h-1.5" style={{ background: house.color }} />

              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3
                        className="text-lg font-extrabold leading-none"
                        style={{ color: house.color }}
                      >
                        {house.name}
                      </h3>
                      {house.isGirlsOnly && (
                        <span className="text-[9px] font-semibold text-pink-500 bg-pink-50 px-1.5 py-0.5 rounded">
                          Girls
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-charcoal-400 italic mt-0.5">
                      &ldquo;{house.slogan}&rdquo;
                    </p>
                  </div>
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center text-sm font-extrabold text-white shadow-sm shrink-0"
                    style={{ background: house.color }}
                  >
                    {house.name.charAt(0)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-2 gap-y-3">
                  {houseInfo.map((info) => {
                    const Icon = info.icon;
                    const val = house[info.key];
                    return (
                      <div key={info.key} className="flex items-center gap-2.5">
                        <Icon className="h-5 w-5 shrink-0" style={{ color: house.color }} />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-charcoal-700 leading-tight tabular-nums">
                            {info.format ? info.format(val as number) : val}
                          </p>
                          <p className="text-xs text-charcoal-400 leading-tight truncate">
                            {info.label}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-3 border-t border-charcoal-100 flex items-center justify-between text-[10px]">
                  <span className="text-charcoal-400 font-medium">Karma Points</span>
                  <span className="font-bold tabular-nums" style={{ color: house.color }}>
                    {house.karma.toLocaleString()}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
