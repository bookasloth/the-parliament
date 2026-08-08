export type TimewheelAd = {
  id: string
  headline: string
  description: string
  subtext: string
  priceLabel: string
  price: string
  punchline: string
  accentColor: string
  gradientFrom: string
  buttonBg: string
  buttonText: string
}

export const TIMEWHEEL_ADS: TimewheelAd[] = [
  {
    id: "tw-websites",
    headline: "websites.",
    description:
      "Fast, clean, made-for-you sites — not a stretched template. Landing pages, company sites, portfolios. Loads quick, ranks well, easy to edit yourself.",
    subtext: "A fellow alum designs and codes it end to end. No agency markup, no ticket queue.",
    priceLabel: "SITES FROM",
    price: "₹4,999",
    punchline: "Cheaper than one month of ads.",
    accentColor: "#38bdf8",
    gradientFrom: "from-sky-500/20",
    buttonBg: "bg-sky-400 hover:bg-sky-300",
    buttonText: "text-gray-900",
  },
  {
    id: "tw-stores",
    headline: "online stores.",
    description:
      "A real store that sells — product pages, cart, checkout, payments and inventory in one place. Works on every phone, money straight to your account.",
    subtext: "We set up payments, shipping and launch for you — then show you how to run it.",
    priceLabel: "STORES FROM",
    price: "₹7,999",
    punchline: "Pays for itself in a handful of orders.",
    accentColor: "#f472b6",
    gradientFrom: "from-pink-500/20",
    buttonBg: "bg-pink-400 hover:bg-pink-300",
    buttonText: "text-gray-900",
  },
  {
    id: "tw-booking",
    headline: "booking\nsoftware.",
    description:
      "Let clients pick a slot themselves — live calendar, auto reminders, online payment, zero double-bookings. For clinics, salons, tutors, consultants.",
    subtext: "We wire it to your calendar and WhatsApp/SMS so the phone stops ringing off the hook.",
    priceLabel: "SETUP FROM",
    price: "₹5,999",
    punchline: "Saves you hours of back-and-forth every week.",
    accentColor: "#4ade80",
    gradientFrom: "from-green-500/20",
    buttonBg: "bg-green-400 hover:bg-green-300",
    buttonText: "text-gray-900",
  },
  {
    id: "tw-alumni",
    headline: "alumni\nnetworks.",
    description:
      "A private home for your batch — member directory, events, groups, donations and a feed. Everything scattered across WhatsApp groups, finally in one place.",
    subtext: "We built ours first. This ad is running on exactly the kind of network we make.",
    priceLabel: "FROM",
    price: "₹6,999",
    punchline: "One shared cost, your whole batch connected.",
    accentColor: "#facc15",
    gradientFrom: "from-yellow-500/20",
    buttonBg: "bg-yellow-400 hover:bg-yellow-300",
    buttonText: "text-gray-900",
  },
  {
    id: "tw-saas",
    headline: "SaaS.",
    description:
      "The software your team logs into every day — dashboards, user accounts, workflows, billing. Built around how you actually work, and owned entirely by you.",
    subtext: "You get an alum on the call, not a sales rep — straight answers on scope, cost and timeline.",
    priceLabel: "FIRST BUILD FROM",
    price: "₹12,000",
    punchline: "Less than a year of the tools it replaces.",
    accentColor: "#fb923c",
    gradientFrom: "from-orange-500/20",
    buttonBg: "bg-orange-500 hover:bg-orange-400",
    buttonText: "text-white",
  },
]

export const TIMEWHEEL_CTA_URL = "https://shubhamdatarkar.com/contact"
export const ROTATION_MS = 60 * 60 * 1000 // 1 hour
