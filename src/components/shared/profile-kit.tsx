// Shared building blocks for profile-style pages (member profile + business page).
// Extracted from profile-view.tsx so both surfaces render the same cards, section
// titles, corner radii, and social-link grid.

import { Globe, Link as LinkIcon } from "lucide-react"

// Corner radii — one card radius, one element radius, used everywhere.
export const R_CARD = "rounded-[5px]"
export const R_EL = "rounded-[4px]"

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`${R_CARD} border border-gray-200/80 bg-white soft-shadow overflow-hidden ${className}`}>{children}</div>
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-7 pt-5 pb-1">
      <h5 className="flex items-center gap-2 font-heading text-[15px] font-bold text-gray-900">
        <span className="inline-block h-[17px] w-[6px] rounded-[3px] bg-brand" />
        {children}
      </h5>
      {action}
    </div>
  )
}

// ─────────────────────────────────────────────
// Brand SVGs (lucide 1.17 doesn't ship brand icons). Simple Icons paths.
// ─────────────────────────────────────────────
export type Brand = (props: { className?: string }) => React.JSX.Element

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "currentColor",
  xmlns: "http://www.w3.org/2000/svg",
} as const

export const LinkedinIcon: Brand = ({ className }) => (
  <svg {...svgProps} className={className}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
)
export const TwitterIcon: Brand = ({ className }) => (
  <svg {...svgProps} className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)
export const InstagramIcon: Brand = ({ className }) => (
  <svg {...svgProps} className={className}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24s3.668-.014 4.948-.072c4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
)
export const FacebookIcon: Brand = ({ className }) => (
  <svg {...svgProps} className={className}>
    <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 011.141.195v3.325a8.623 8.623 0 00-.653-.036 26.805 26.805 0 00-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 00-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
  </svg>
)
export const YoutubeIcon: Brand = ({ className }) => (
  <svg {...svgProps} className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
)
export const GithubIcon: Brand = ({ className }) => (
  <svg {...svgProps} className={className}>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
)

/** Resolve a platform key → its brand icon (falls back to a generic link glyph). */
export function brandIconFor(platform: string): Brand {
  const p = platform.toLowerCase()
  if (p === "linkedin") return LinkedinIcon
  if (p === "twitter" || p === "x") return TwitterIcon
  if (p === "instagram") return InstagramIcon
  if (p === "facebook") return FacebookIcon
  if (p === "youtube") return YoutubeIcon
  if (p === "github") return GithubIcon
  if (p === "website" || p === "web" || p === "site") return Globe as unknown as Brand
  return LinkIcon as unknown as Brand
}

function labelForPlatform(p: string): string {
  const k = p.toLowerCase()
  const map: Record<string, string> = {
    linkedin: "LinkedIn", twitter: "Twitter", x: "Twitter", instagram: "Instagram",
    facebook: "Facebook", youtube: "YouTube", github: "GitHub",
    website: "Website", web: "Website", site: "Website",
  }
  return map[k] ?? p.charAt(0).toUpperCase() + p.slice(1)
}

/**
 * "Connect with me" card — LinkedIn + arbitrary socialLinks rendered as a grid of
 * brand-icon buttons. De-dupes by platform key; returns null when there's nothing
 * to show. Shared by the member profile and the business page.
 */
export function SocialLinks({
  linkedinUrl,
  socialLinks,
  title = "Connect with me",
}: {
  linkedinUrl?: string | null
  socialLinks: Record<string, string>
  title?: string
}) {
  const links: { key: string; href: string; label: string; Icon: Brand }[] = []
  const seen = new Set<string>()
  const add = (key: string, href: string) => {
    const k = key.toLowerCase()
    if (!href || seen.has(k)) return
    seen.add(k)
    links.push({ key, href, label: labelForPlatform(key), Icon: brandIconFor(key) })
  }
  if (linkedinUrl) add("linkedin", linkedinUrl)
  for (const [platform, url] of Object.entries(socialLinks)) add(platform, url)
  if (links.length === 0) return null

  return (
    <Card>
      <SectionTitle>{title}</SectionTitle>
      <div className="px-7 pb-6 pt-1 flex flex-wrap gap-2.5">
        {links.map(({ key, href, label, Icon }) => (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            className="flex h-10 w-10 items-center justify-center rounded-[4px] border border-gray-200 text-gray-600 transition-colors hover:border-brand hover:bg-brand hover:text-white"
          >
            <Icon className="h-4 w-4" />
          </a>
        ))}
      </div>
    </Card>
  )
}
