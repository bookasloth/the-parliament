import type { AlumniCard, Membership } from "@/lib/homepage-data"

/** A person surfaced in discovery / suggestions. */
export interface NetworkAlumni {
  id: string
  name: string
  username: string
  batch: string
  batchLabel: string
  house: string
  membership: Membership
  verified: boolean
  headline: string
  company?: string
  city?: string
  industry?: string
  avatar: string
  /** Optional cover photo; falls back to the house colour banner. */
  cover?: string
  mutualCount: number
  /** Short conversion blurb, e.g. "Same batch" or "Works at Google". */
  socialProof: string
}

export interface PendingRequest {
  id: string
  name: string
  username: string
  batch: string
  house: string
  avatar: string
  mutualCount: number
  /** Relative time the request was created. */
  when: string
}

export interface ActivityEntry {
  id: string
  name: string
  username: string
  avatar: string
  /** Action text, e.g. "earned the Mentor badge". */
  action: string
  when: string
  type: "join" | "event" | "badge" | "post"
  /** Optional deep link for the quick action. */
  href?: string
}

export interface NetworkEvent {
  id: string
  slug: string
  title: string
  date: string
  location: string
  cover: string
  interested: number
  isFree: boolean
  price?: number
}

export interface Chapter {
  id: string
  slug: string
  name: string
  city: string
  members: number
  recentActivity: string
  cover: string
  joined: boolean
}

export type DiscoveryTab =
  | "discover"
  | "nearby"
  | "batch"
  | "company"
  | "mentors"
  | "committee"

export const DISCOVERY_TABS: { key: DiscoveryTab; label: string }[] = [
  { key: "discover", label: "Discover" },
  { key: "nearby", label: "Nearby" },
  { key: "batch", label: "Same Batch" },
  { key: "company", label: "Same Company" },
  { key: "mentors", label: "Mentors" },
  { key: "committee", label: "Committee" },
]

/** House → banner colour, mirrors globals.css house tokens. */
export const HOUSE_BANNER: Record<string, string> = {
  Aravali: "#5a9bd5",
  Nilgiri: "#70ad47",
  Shiwalik: "#e8503a",
  Udaigiri: "#ffe135",
  Indira: "#ff9933",
  Laxmi: "#e75480",
}

export const MEMBERSHIP_BADGE: Partial<
  Record<Membership, { label: string; className: string }>
> = {
  life: { label: "Life", className: "bg-gold-50 text-gold-700 border border-gold-200" },
  premium: { label: "Premium", className: "bg-brand-50 text-brand-700 border border-brand-100" },
  committee: { label: "Committee", className: "bg-purple-50 text-purple-700 border border-purple-200" },
}

const AV = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=200&h=200&fit=crop&crop=face`

export const sidebarNav = [
  { key: "connections", label: "Connections", count: 142, href: "/connections", icon: "users" },
  { key: "following", label: "Following", count: 58, href: "/connections", icon: "userPlus" },
  { key: "groups", label: "Groups", count: 7, href: "/groups", icon: "layers" },
  { key: "events", label: "Events", count: 4, href: "/events", icon: "calendar" },
  { key: "chapters", label: "Chapters", count: 6, href: "/network", icon: "mapPin" },
  { key: "companies", label: "Companies", count: null, href: "/companies/all", icon: "building" },
  { key: "newsletters", label: "Newsletters", count: 3, href: "/network", icon: "mail" },
] as const

export const me = {
  name: "Shubham N Datarkar",
  username: "shubham-datarkar",
  headline: "Founder at The Bogus Company",
  batchLabel: "Batch 2014",
  avatar: AV("1535713875002-d1d0cf377fde"),
  connections: 142,
}

export const suggestedAlumni: NetworkAlumni[] = [
  { id: "u1", name: "Arjun Mehta", username: "arjun-mehta", batch: "2014", batchLabel: "Batch 2014", house: "Aravali", membership: "premium", verified: true, headline: "Product Manager at Razorpay · ex-Flipkart", company: "Razorpay", city: "Bangalore", industry: "Fintech", avatar: AV("1500648767791-00dcc994a43e"), mutualCount: 12, socialProof: "Same batch · 12 mutual" },
  { id: "u2", name: "Sneha Kulkarni", username: "sneha-kulkarni", batch: "2012", batchLabel: "Batch 2012", house: "Laxmi", membership: "life", verified: true, headline: "Digital Marketing Strategist · Founder, BrightReach", company: "BrightReach", city: "Pune", industry: "Marketing", avatar: AV("1494790108377-be9c29b29330"), mutualCount: 8, socialProof: "Lives in Pune · 8 mutual" },
  { id: "u3", name: "Rohan Deshpande", username: "rohan-deshpande", batch: "2014", batchLabel: "Batch 2014", house: "Shiwalik", membership: "committee", verified: true, headline: "Software Engineer at Google", company: "Google", city: "Hyderabad", industry: "Technology", avatar: AV("1507003211169-0a1dd7228f2d"), mutualCount: 19, socialProof: "Same batch · Works at Google" },
  { id: "u4", name: "Priya Nair", username: "priya-nair", batch: "2010", batchLabel: "Batch 2010", house: "Indira", membership: "premium", verified: false, headline: "Civil Servant · IRS Officer", city: "New Delhi", industry: "Government", avatar: AV("1573496359142-b8d87734a5a2"), mutualCount: 5, socialProof: "5 mutual alumni" },
  { id: "u5", name: "Vikram Joshi", username: "vikram-joshi", batch: "2008", batchLabel: "Batch 2008", house: "Nilgiri", membership: "life", verified: true, headline: "Neurosurgeon at Apollo Hospitals", company: "Apollo Hospitals", city: "Hyderabad", industry: "Healthcare", avatar: AV("1612349317150-e413f6a5b16d"), mutualCount: 3, socialProof: "Attended Annual Meet 2026" },
  { id: "u6", name: "Ananya Rao", username: "ananya-rao", batch: "2015", batchLabel: "Batch 2015", house: "Udaigiri", membership: "premium", verified: true, headline: "UX Designer at Swiggy", company: "Swiggy", city: "Bangalore", industry: "Design", avatar: AV("1487412720507-e7ab37603c6f"), mutualCount: 14, socialProof: "Works in Bangalore · 14 mutual" },
  { id: "u7", name: "Karan Malhotra", username: "karan-malhotra", batch: "2014", batchLabel: "Batch 2014", house: "Aravali", membership: "committee", verified: true, headline: "Founder & CEO at LaunchPad Labs", company: "LaunchPad Labs", city: "Mumbai", industry: "Startup", avatar: AV("1472099645785-5658abf4ff4e"), mutualCount: 21, socialProof: "Same batch · 21 mutual" },
  { id: "u8", name: "Meera Iyer", username: "meera-iyer", batch: "2011", batchLabel: "Batch 2011", house: "Laxmi", membership: "life", verified: false, headline: "Data Scientist at Microsoft", company: "Microsoft", city: "Pune", industry: "Technology", avatar: AV("1580489944761-15a19d654956"), mutualCount: 7, socialProof: "Lives in Pune · 7 mutual" },
]

export const incomingRequests: PendingRequest[] = [
  { id: "r1", name: "Aditya Kapoor", username: "aditya-kapoor", batch: "Batch 2013", house: "Shiwalik", avatar: AV("1506794778202-cad84cf45f1d"), mutualCount: 9, when: "2d ago" },
  { id: "r2", name: "Divya Sharma", username: "divya-sharma", batch: "Batch 2014", house: "Indira", avatar: AV("1438761681033-6461ffad8d80"), mutualCount: 4, when: "5d ago" },
  { id: "r3", name: "Nikhil Verma", username: "nikhil-verma", batch: "Batch 2009", house: "Nilgiri", avatar: AV("1463453091185-61582044d556"), mutualCount: 2, when: "1w ago" },
]

export const sentRequests: PendingRequest[] = [
  { id: "s1", name: "Rajesh Pillai", username: "rajesh-pillai", batch: "Batch 2012", house: "Aravali", avatar: AV("1519085360753-af0119f7cbe7"), mutualCount: 6, when: "3d ago" },
  { id: "s2", name: "Tanvi Shah", username: "tanvi-shah", batch: "Batch 2015", house: "Udaigiri", avatar: AV("1544005313-94ddf0286df2"), mutualCount: 11, when: "6d ago" },
]

export const recentActivity: ActivityEntry[] = [
  { id: "a1", name: "Raj Khanna", username: "raj-khanna", avatar: AV("1633332755192-727a05c4013d"), action: "joined the alumni association", when: "1h ago", type: "join", href: "/profile/raj-khanna" },
  { id: "a2", name: "Priya Nair", username: "priya-nair", avatar: AV("1573496359142-b8d87734a5a2"), action: "attended Annual Meet 2026", when: "3h ago", type: "event", href: "/events/annual-meet-2026" },
  { id: "a3", name: "Amit Verma", username: "amit-verma", avatar: AV("1607990281513-2c110a25bd8c"), action: "earned the Mentor badge", when: "6h ago", type: "badge", href: "/profile/amit-verma" },
  { id: "a4", name: "Neha Gupta", username: "neha-gupta", avatar: AV("1559839734-2b71ea197ec2"), action: "published a post", when: "1d ago", type: "post", href: "/feed" },
  { id: "a5", name: "Karan Malhotra", username: "karan-malhotra", avatar: AV("1472099645785-5658abf4ff4e"), action: "joined the Mumbai Chapter", when: "2d ago", type: "join", href: "/network" },
]

export const suggestedEvents: NetworkEvent[] = [
  { id: "e1", slug: "alumni-reunion-2026", title: "JNV Nagpur Alumni Reunion 2026", date: "Oct 15, 2026", location: "Nagpur", cover: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&h=400&fit=crop", interested: 89, isFree: false, price: 500 },
  { id: "e2", slug: "tech-talk-ai-careers", title: "Tech Talk: AI & Careers in 2026", date: "Jul 5, 2026", location: "Online", cover: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop", interested: 120, isFree: true },
  { id: "e3", slug: "mumbai-chapter-meet", title: "Mumbai Chapter Networking Meet", date: "Feb 15, 2026", location: "Mumbai", cover: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop", interested: 45, isFree: true },
  { id: "e4", slug: "startup-showcase-2026", title: "Navodayan Startup Showcase", date: "Aug 3, 2026", location: "Nagpur", cover: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&h=400&fit=crop", interested: 67, isFree: false, price: 200 },
]

export const chapters: Chapter[] = [
  { id: "c1", slug: "pune", name: "Pune Chapter", city: "Pune", members: 84, recentActivity: "Meetup last weekend", cover: "https://images.unsplash.com/photo-1572445271230-a78b5944a659?w=600&h=200&fit=crop", joined: true },
  { id: "c2", slug: "mumbai", name: "Mumbai Chapter", city: "Mumbai", members: 126, recentActivity: "3 new members this week", cover: "https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?w=600&h=200&fit=crop", joined: false },
  { id: "c3", slug: "dubai", name: "Dubai Chapter", city: "Dubai", members: 37, recentActivity: "Iftar meet planned", cover: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=200&fit=crop", joined: false },
  { id: "c4", slug: "usa", name: "USA Chapter", city: "United States", members: 52, recentActivity: "Virtual mixer on Sat", cover: "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=600&h=200&fit=crop", joined: false },
]

export interface ChapterMember {
  card: AlumniCard
  role?: "Lead" | "Co-organizer"
  verified?: boolean
}

export interface ChapterDetail extends Chapter {
  founded: string
  about: string
  /** Wide hero banner (chapters list uses a shorter strip). */
  hero: string
  members_list: ChapterMember[]
  events: NetworkEvent[]
  activity: ActivityEntry[]
}

const mkMember = (
  id: string, name: string, batchLabel: string, house: string,
  membership: Membership, location: string, bio: string, photo: string,
  role?: ChapterMember["role"], verified = false,
): ChapterMember => ({
  role, verified,
  card: { id, name, batch: batchLabel, batchLabel, batchAlt: batchLabel, house, company: "", achievement: "", image: photo, location, membership, bio },
})

const PH = (id: string) => `https://images.unsplash.com/photo-${id}?w=300&h=300&fit=crop&crop=face`

const chapterDetails: Record<string, ChapterDetail> = {
  pune: {
    ...chapters[0],
    founded: "Founded 2019",
    hero: "https://images.unsplash.com/photo-1572445271230-a78b5944a659?w=1200&h=400&fit=crop",
    about: "The Pune Chapter brings together Navodayans across the city for monthly meetups, mentorship circles, and weekend treks. Whether you've just moved to Pune or have called it home for years, there's a seat for you at the table.",
    members_list: [
      mkMember("pm1", "Sneha Kulkarni", "Batch 2012", "Laxmi", "life", "Pune", "Founder, BrightReach", PH("1494790108377-be9c29b29330"), "Lead", true),
      mkMember("pm2", "Meera Iyer", "Batch 2011", "Laxmi", "life", "Pune", "Data Scientist · Microsoft", PH("1580489944761-15a19d654956"), "Co-organizer", true),
      mkMember("pm3", "Arjun Nair", "Batch 2009", "Aravali", "associate", "Pune", "CA · Deloitte India", PH("1519085360753-af0119f7cbe7"), undefined, true),
      mkMember("pm4", "Karan Joshi", "Batch 2015", "Udaigiri", "premium", "Pune", "Data Scientist · Amazon", PH("1527980965255-d3b416303d12"), undefined, false),
      mkMember("pm5", "Deepa Krishnan", "Batch 2013", "Laxmi", "associate", "Pune", "Journalist · Indian Express", PH("1573497019940-1c28c88b4f3e"), undefined, false),
    ],
    events: [suggestedEvents[1], suggestedEvents[3]],
    activity: [recentActivity[0], recentActivity[2]],
  },
  mumbai: {
    ...chapters[1],
    founded: "Founded 2017",
    hero: "https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?w=1200&h=400&fit=crop",
    about: "Mumbai's Navodayan community is one of the largest and most active. From Bandra brunches to startup demo nights, the Mumbai Chapter keeps the JNV spirit alive in the city that never sleeps.",
    members_list: [
      mkMember("mm1", "Karan Malhotra", "Batch 2014", "Aravali", "committee", "Mumbai", "Founder & CEO · LaunchPad Labs", PH("1472099645785-5658abf4ff4e"), "Lead", true),
      mkMember("mm2", "Tanvi Shah", "Batch 2015", "Udaigiri", "premium", "Mumbai", "Brand Manager · Unilever", PH("1544005313-94ddf0286df2"), "Co-organizer", false),
      mkMember("mm3", "Aditya Kapoor", "Batch 2013", "Shiwalik", "associate", "Mumbai", "Investment Banker · ICICI", PH("1506794778202-cad84cf45f1d"), undefined, true),
      mkMember("mm4", "Ananya Singh", "Batch 2016", "Nilgiri", "student", "Mumbai", "Marketing Manager · FMCG", PH("1531746020798-e6953c6e8e04"), undefined, false),
    ],
    events: [suggestedEvents[2], suggestedEvents[0]],
    activity: [recentActivity[4], recentActivity[3]],
  },
  dubai: {
    ...chapters[2],
    founded: "Founded 2021",
    hero: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&h=400&fit=crop",
    about: "The Dubai Chapter connects Navodayans across the Gulf. Iftar gatherings, desert drives, and career roundtables — a home away from home for the JNV diaspora in the UAE.",
    members_list: [
      mkMember("dm1", "Rajesh Pillai", "Batch 2008", "Aravali", "life", "Dubai", "Project Director · Emaar", PH("1519085360753-af0119f7cbe7"), "Lead", true),
      mkMember("dm2", "Priya Nair", "Batch 2010", "Indira", "premium", "Dubai", "IRS Officer (on deputation)", PH("1573496359142-b8d87734a5a2"), "Co-organizer", false),
      mkMember("dm3", "Nikhil Verma", "Batch 2009", "Nilgiri", "associate", "Dubai", "Software Architect · Careem", PH("1463453091185-61582044d556"), undefined, false),
    ],
    events: [suggestedEvents[1]],
    activity: [recentActivity[1]],
  },
  usa: {
    ...chapters[3],
    founded: "Founded 2020",
    hero: "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=1200&h=400&fit=crop",
    about: "Spanning coast to coast, the USA Chapter hosts virtual mixers, Diwali meets, and grad-school mentorship for Navodayans across America. Time zones apart, one family.",
    members_list: [
      mkMember("um1", "Rohan Deshpande", "Batch 2014", "Shiwalik", "committee", "San Francisco", "Software Engineer · Google", PH("1507003211169-0a1dd7228f2d"), "Lead", true),
      mkMember("um2", "Ananya Rao", "Batch 2015", "Udaigiri", "premium", "New York", "UX Designer · Meta", PH("1487412720507-e7ab37603c6f"), "Co-organizer", true),
      mkMember("um3", "Vikram Joshi", "Batch 2008", "Nilgiri", "life", "Boston", "Researcher · MIT", PH("1612349317150-e413f6a5b16d"), undefined, true),
    ],
    events: [suggestedEvents[1], suggestedEvents[2]],
    activity: [recentActivity[3]],
  },
}

export function getChapterDetail(slug: string): ChapterDetail | undefined {
  return chapterDetails[slug]
}
