"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Store, Calendar, Award } from "lucide-react";
import type { Activity } from "@/lib/homepage-data";

interface LiveActivityFeedProps {
  activities?: Activity[];
}

const typeIcons = {
  join: UserPlus,
  business: Store,
  event: Calendar,
  premium: Award,
};

const typeColors = {
  join: "text-blue-500 bg-blue-50",
  business: "text-green-500 bg-green-50",
  event: "text-purple-500 bg-purple-50",
  premium: "text-gold-500 bg-gold-50",
};

export function LiveActivityFeed({
  activities = [],
}: LiveActivityFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (activities.length === 0) return;
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % activities.length);
        setIsVisible(true);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, [activities.length]);

  if (activities.length === 0) return null;

  const current = activities[currentIndex];
  const Icon = typeIcons[current.type];
  const colorClass = typeColors[current.type];

  return (
    <section className="py-10 bg-navy-50/50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <p className="text-xs font-semibold text-charcoal-400 uppercase tracking-wider">
            Live Activity
          </p>
        </div>

        <div className="flex justify-center h-12">
          <AnimatePresence mode="wait">
            {isVisible && (
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-3"
              >
                <div className={`rounded-full p-2 ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-sm text-charcoal-500 font-medium">
                  {current.message}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
