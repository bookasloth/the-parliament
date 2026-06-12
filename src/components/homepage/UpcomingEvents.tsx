"use client";

import { motion } from "framer-motion";
import { Calendar, MapPin, Users, ArrowRight } from "lucide-react";
import type { EventCard } from "@/lib/homepage-data";

interface UpcomingEventsProps {
  events?: EventCard[];
}

export function UpcomingEvents({ events = [] }: UpcomingEventsProps) {
  if (events.length === 0) return null;

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy-500">
            Upcoming Events
          </h2>
          <p className="mt-4 text-base text-charcoal-400 max-w-2xl mx-auto">
            Never miss a chance to reconnect
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {events.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group rounded-[20px] bg-white overflow-hidden card-shadow hover:shadow-lg transition-all duration-300"
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src={event.banner}
                  alt={event.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-navy-600">
                    <Calendar className="h-3 w-3" />
                    {event.date}
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <h3 className="font-bold text-charcoal-800 text-sm leading-snug line-clamp-2 min-h-[2.5rem]">
                  {event.title}
                </h3>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-charcoal-400">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{event.venue}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-charcoal-400">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    <span>{event.rsvpCount} going</span>
                  </div>
                </div>
                <a
                  href="#"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-navy-500 hover:text-navy-600 transition-colors group/cta"
                >
                  Register Now
                  <ArrowRight className="h-3 w-3 transition-transform group-hover/cta:translate-x-0.5" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded-full border border-charcoal-200 bg-white px-7 py-3 text-sm font-semibold text-charcoal-600 hover:bg-charcoal-50 transition-all shadow-sm"
          >
            View All Events
          </a>
        </div>
      </div>
    </section>
  );
}
