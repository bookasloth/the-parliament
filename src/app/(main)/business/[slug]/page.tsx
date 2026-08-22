import { cache } from "react"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getBusinessBySlug } from "@/modules/business/service"
import { loadBusiness } from "./load-business"

const BASE = "https://nnawca.org"

// Dedupe the DB read across generateMetadata + the page render (same request).
const getBusiness = cache(getBusinessBySlug)

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const b = await getBusiness(slug)
  if (!b || b.status !== "approved") return { title: "Business not found | NNAWCA" }

  const title = `${b.name} — ${b.category.label} | NNAWCA`
  const description = (b.tagline || b.description?.slice(0, 155) || `${b.name}, a ${b.category.label} run by a JNV Nagpur alumnus.`).trim()
  const url = `${BASE}/business/${b.slug}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", siteName: "NNAWCA" },
    twitter: { card: "summary_large_image", title, description },
  }
}

export default async function BusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const b = await getBusiness(slug)
  if (!b || b.status !== "approved") notFound()

  // Organization + aggregateRating JSON-LD → Google rich result / knowledge card.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: b.name,
    url: `${BASE}/business/${b.slug}`,
    ...(b.logoUrl ? { logo: b.logoUrl } : {}),
    ...(b.description ? { description: b.description } : {}),
    ...(b.tagline ? { slogan: b.tagline } : {}),
    ...(b.foundedYear ? { foundingDate: String(b.foundedYear) } : {}),
    ...(b.website ? { sameAs: [b.website] } : {}),
    ...(b.headquarters || b.city ? { address: { "@type": "PostalAddress", addressLocality: b.headquarters || b.city } } : {}),
    ...(b.ratingCount > 0 ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Number(b.ratingAvg).toFixed(1),
        reviewCount: b.ratingCount,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {await loadBusiness(b)}
    </>
  )
}
