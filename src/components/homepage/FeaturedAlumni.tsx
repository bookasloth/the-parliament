"use client"

import { motion } from "framer-motion"
import type { AlumniCard } from "@/lib/homepage-data"
import { AlumniProfileCard } from "@/components/shared/AlumniProfileCard"
import { ChevronRight } from "lucide-react"

interface FeaturedAlumniProps {
  alumni?: AlumniCard[]
}

export function FeaturedAlumni({ alumni = [] }: FeaturedAlumniProps) {
  if (alumni.length === 0) return null

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-brand">
            Featured Alumni
          </h2>
          <p className="mt-4 text-base text-charcoal-400 max-w-2xl mx-auto">
            Pride of JNV Nagpur — making a difference across India and the world
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {alumni.map((person, i) => (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <AlumniProfileCard alumni={person} />
            </motion.div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded border border-gray-200 bg-white px-7 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
          >
            Explore Alumni Directory
          </a>
        </div>
      </div>
    </section>
  )
}
