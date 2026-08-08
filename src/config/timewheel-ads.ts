const CDN = "https://website-assets.shubhamdatarkar.in/nnawca/ad"

export const TIMEWHEEL_ADS = [
  { id: "tw-websites", src: `${CDN}/tw-websites.png`, alt: "Timewheel — We build websites" },
  { id: "tw-stores",   src: `${CDN}/tw-stores.png`,   alt: "Timewheel — We build online stores" },
  { id: "tw-booking",  src: `${CDN}/tw-booking.png`,  alt: "Timewheel — We build booking software" },
  { id: "tw-alumni",   src: `${CDN}/tw-alumni.png`,   alt: "Timewheel — We build alumni networks" },
  { id: "tw-saas",     src: `${CDN}/tw-saas.png`,     alt: "Timewheel — We build SaaS" },
] as const

export const TIMEWHEEL_CTA_URL = "https://shubhamdatarkar.com/contact"
export const ROTATION_MS = 60 * 60 * 1000 // 1 hour
