"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Menu, X, Users } from "lucide-react";

interface StickyNavProps {
  logoLabel?: string;
  centerLinks?: { label: string; href: string }[];
  ctaLabel?: string;
}

export function StickyNav({
  logoLabel = "Nagpur Navodaya Alumni Network",
  centerLinks = [
    { label: "About", href: "#" },
    { label: "Events", href: "#" },
    { label: "Businesses", href: "#" },
    { label: "Impact", href: "#" },
    { label: "Blog", href: "#" },
  ],
  ctaLabel = "Join Community",
}: StickyNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "glass-strong shadow-sm"
          : "bg-transparent"
      )}
    >
      <nav
        className={cn(
          "mx-auto flex items-center justify-between px-6 transition-all duration-300",
          scrolled ? "h-16" : "h-[72px]",
          "max-w-7xl"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-500">
            <Users className="h-5 w-5 text-white" />
          </div>
          <span
            className={cn(
              "font-body font-semibold tracking-tight transition-all duration-300",
              scrolled ? "text-sm" : "text-base"
            )}
          >
            <span className="hidden sm:inline">{logoLabel}</span>
            <span className="sm:hidden">NNAWCA</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {centerLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-charcoal-500 hover:text-navy-500 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <a
            href="/auth/signin"
            className="text-sm font-medium text-charcoal-500 hover:text-navy-500 transition-colors px-4 py-2"
          >
            Login
          </a>
          <a
            href="/auth/signup"
            className="rounded-full bg-navy-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-600 transition-all shadow-sm hover:shadow-md"
          >
            {ctaLabel}
          </a>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden rounded-lg p-2 text-charcoal-500 hover:bg-charcoal-100 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass-strong border-t border-charcoal-100"
          >
            <div className="px-6 py-4 space-y-3">
              {centerLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block text-sm font-medium text-charcoal-500 hover:text-navy-500 py-2"
                >
                  {link.label}
                </a>
              ))}
              <hr className="border-charcoal-100" />
              <a
                href="/auth/signin"
                className="block text-sm font-medium text-charcoal-500 py-2"
              >
                Login
              </a>
              <a
                href="/auth/signup"
                className="block text-center rounded-full bg-navy-500 px-5 py-2.5 text-sm font-semibold text-white"
              >
                {ctaLabel}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
