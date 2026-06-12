import { Users, Mail, ExternalLink } from "lucide-react";
import type { FooterColumn } from "@/lib/homepage-data";

interface FooterProps {
  columns?: FooterColumn[];
  email?: string;
  socialLinks?: { label: string; url: string }[];
}

export function Footer({
  columns = [],
  email = "contact@nnawca.org",
  socialLinks = [],
}: FooterProps) {
  return (
    <footer className="bg-charcoal-800 text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <Users className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-sm">NNAWCA</span>
            </div>
            <p className="text-sm text-white/60 max-w-xs">
              Nagpur Navodaya Alumni Welfare and Charitable Association — connecting
              JNV Nagpur alumni worldwide.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-white/60">
              <Mail className="h-4 w-4" />
              <a href={`mailto:${email}`} className="hover:text-white transition-colors">
                {email}
              </a>
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-bold text-sm mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-white/60 hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {socialLinks.length > 0 && (
          <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/40">
              &copy; {new Date().getFullYear()} NNAWCA. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  className="text-sm text-white/60 hover:text-white transition-colors flex items-center gap-1"
                >
                  {link.label}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
