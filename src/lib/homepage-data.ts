export interface NavLink {
  label: string;
  href: string;
}

export interface NavConfig {
  logoLabel: string;
  centerLinks: NavLink[];
  ctaLabel: string;
}

export interface HeroContent {
  title: string;
  subtitle: string;
  metrics: { label: string; value: string }[];
  primaryCta: string;
  secondaryCta: string;
}

export interface Activity {
  id: string;
  message: string;
  type: "join" | "business" | "event" | "premium";
}

export interface WhyJoinCard {
  icon: string;
  title: string;
  description: string;
}

export interface AlumniCard {
  id: string;
  name: string;
  batch: string;
  house: string;
  company: string;
  achievement: string;
  image: string;
}

export interface BusinessCard {
  id: string;
  name: string;
  founder: string;
  category: string;
  city: string;
  logo: string;
  website: string;
}

export interface EventCard {
  id: string;
  title: string;
  date: string;
  venue: string;
  rsvpCount: number;
  banner: string;
}

export interface ImpactMetric {
  label: string;
  value: number;
  suffix?: string;
}

export interface Testimonial {
  id: string;
  name: string;
  batch: string;
  house: string;
  role: string;
  quote: string;
  rating: number;
  image: string;
}

export interface House {
  id: string;
  name: string;
  color: string;
  members: number;
  gamesPlayed: number;
  tournamentsWon: number;
  businesses: number;
  moneyDonated: number;
  paidMembers: number;
  karma: number;
  slogan: string;
  isGirlsOnly?: boolean;
}

export interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

export interface HomepageContent {
  nav: NavConfig;
  hero: HeroContent;
  activities: Activity[];
  whyJoinCards: WhyJoinCard[];
  featuredAlumni: AlumniCard[];
  businessShowcase: BusinessCard[];
  upcomingEvents: EventCard[];
  impactMetrics: ImpactMetric[];
  testimonials: Testimonial[];
  houses: House[];
  finalCta: { title: string; primaryCta: string; secondaryCta: string };
  footer: {
    columns: FooterColumn[];
    contact: { email: string; socialLinks: { label: string; url: string }[] };
  };
}

export const batchRanges = Array.from({ length: 33 }, (_, i) => {
  const start = 1986 + i;
  const end = start + 7;
  return { label: `${start}–${end}`, start, end };
});

export const defaultHomepageContent: HomepageContent = {
  nav: {
    logoLabel: "Nagpur Navodaya Alumni Network",
    centerLinks: [
      { label: "About", href: "#" },
      { label: "Events", href: "#" },
      { label: "Businesses", href: "#" },
      { label: "Impact", href: "#" },
      { label: "Blog", href: "#" },
    ],
    ctaLabel: "Join Community",
  },
  hero: {
    title: "Your JNV Journey Didn't End at Graduation.",
    subtitle:
      "Reconnect with alumni, discover opportunities, grow your network, support businesses, and shape the future of the community.",
    metrics: [
      { label: "Alumni", value: "500+" },
      { label: "Cities", value: "50+" },
      { label: "Careers", value: "100+" },
      { label: "Businesses", value: "20+" },
    ],
    primaryCta: "Join Community",
    secondaryCta: "Explore Network",
  },
  activities: [
    { id: "1", message: "Rohit from B1 joined from Pune.", type: "join" },
    { id: "2", message: "Ananya from B5 started a new business.", type: "business" },
    { id: "3", message: "12 alumni registered for the annual meetup.", type: "event" },
    { id: "4", message: "Rahul upgraded to Life Member.", type: "premium" },
    { id: "5", message: "Priya from B4 joined from Mumbai.", type: "join" },
    { id: "6", message: "Vikram launched a mentorship program.", type: "business" },
    { id: "7", message: "8 alumni registered for the Delhi chapter meetup.", type: "event" },
    { id: "8", message: "Sunita upgraded to Life Member.", type: "premium" },
  ],
  whyJoinCards: [
    {
      icon: "users",
      title: "Find Your Lost Tribe",
      description: "That friend from Aravali House? The one who shared your tiffin in 1998? They're here. So are 500+ others. Reconnect like you never left.",
    },
    {
      icon: "briefcase",
      title: "Your Career Accelerator",
      description: "IAS officers, scientists at ISRO, founders, doctors — your seniors are just a message away. Mentorship that actually changes your trajectory.",
    },
    {
      icon: "store",
      title: "The JNV Business Network",
      description: "Every business card in this directory belongs to a Navodayan. Hire, partner, or just cheer — our economy stays in the family.",
    },
    {
      icon: "calendar",
      title: "Never Miss a Reunion",
      description: "From Nagpur to Mumbai, Delhi to Bangalore — chapter meets, annual gatherings, and spontaneous chai meetups. Your calendar just got fuller.",
    },
    {
      icon: "graduation-cap",
      title: "Guide the Next Gen",
      description: "Remember who helped you? Now it's your turn. Mentor current students, speak at career sessions, or fund a scholarship. Leave a legacy.",
    },
    {
      icon: "heart-handshake",
      title: "Give Back, Feel Good",
      description: "Crowdfunding for a classmate in need. Sponsoring a student's education. Building a lab at JNV. Real impact, real fast, real Navodayan.",
    },
  ],
  featuredAlumni: [
    {
      id: "1",
      name: "Arun Sharma",
      batch: "B1",
      house: "Aravali",
      company: "Indian Administrative Service",
      achievement: "IAS Officer",
      image: "/images/alumni/placeholder-1.jpg",
    },
    {
      id: "2",
      name: "Dr. Neha Gupta",
      batch: "B2",
      house: "Nilgiri",
      company: "AIIMS Delhi",
      achievement: "Senior Cardiologist",
      image: "/images/alumni/placeholder-2.jpg",
    },
    {
      id: "3",
      name: "Rahul Verma",
      batch: "B3",
      house: "Udaigiri",
      company: "TechStartup Inc.",
      achievement: "Founder & CEO",
      image: "/images/alumni/placeholder-3.jpg",
    },
    {
      id: "4",
      name: "Priya Patel",
      batch: "B4",
      house: "Indira",
      company: "ISRO",
      achievement: "Space Scientist",
      image: "/images/alumni/placeholder-4.jpg",
    },
    {
      id: "5",
      name: "Dr. Suresh Reddy",
      batch: "B2",
      house: "Shiwalik",
      company: "Apollo Hospitals",
      achievement: "Neurosurgeon",
      image: "/images/alumni/placeholder-5.jpg",
    },
    {
      id: "6",
      name: "Ananya Singh",
      batch: "B5",
      house: "Laxmi",
      company: "Google",
      achievement: "Software Engineer",
      image: "/images/alumni/placeholder-6.jpg",
    },
  ],
  businessShowcase: [
    {
      id: "1",
      name: "EduBright Academy",
      founder: "Rohit Joshi",
      category: "Education",
      city: "Nagpur",
      logo: "https://images.unsplash.com/photo-1523050854058-8df90110c7f1?w=200&h=200&fit=crop",
      website: "#",
    },
    {
      id: "2",
      name: "GreenEarth Organics",
      founder: "Ananya Deshmukh",
      category: "Agriculture",
      city: "Pune",
      logo: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop",
      website: "#",
    },
    {
      id: "3",
      name: "CodeForge Technologies",
      founder: "Vikram Patil",
      category: "Technology",
      city: "Bangalore",
      logo: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=200&h=200&fit=crop",
      website: "#",
    },
    {
      id: "4",
      name: "HealthFirst Clinics",
      founder: "Dr. Neha Gupta",
      category: "Healthcare",
      city: "Delhi",
      logo: "https://images.unsplash.com/photo-1551076805-e1869033e561?w=200&h=200&fit=crop",
      website: "#",
    },
    {
      id: "5",
      name: "Nagpur Bites",
      founder: "Priya Kulkarni",
      category: "Food & Beverage",
      city: "Nagpur",
      logo: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=200&fit=crop",
      website: "#",
    },
    {
      id: "6",
      name: "DesignCraft Studio",
      founder: "Siddharth Rao",
      category: "Design",
      city: "Mumbai",
      logo: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=200&h=200&fit=crop",
      website: "#",
    },
  ],
  upcomingEvents: [
    {
      id: "1",
      title: "Annual Grand Reunion 2026",
      date: "Dec 25, 2026",
      venue: "JNV Navegaon Khairi, Nagpur",
      rsvpCount: 89,
      banner: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&h=400&fit=crop",
    },
    {
      id: "2",
      title: "Mumbai Chapter Networking Meet",
      date: "Feb 15, 2026",
      venue: "Andheri, Mumbai",
      rsvpCount: 45,
      banner: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop",
    },
    {
      id: "3",
      title: "Career Guidance Webinar",
      date: "Mar 10, 2026",
      venue: "Online (Zoom)",
      rsvpCount: 120,
      banner: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=400&fit=crop",
    },
    {
      id: "4",
      title: "Entrepreneurship Summit",
      date: "Apr 5, 2026",
      venue: "Nagpur",
      rsvpCount: 67,
      banner: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&h=400&fit=crop",
    },
  ],
  impactMetrics: [
    { label: "Registered Alumni", value: 500, suffix: "+" },
    { label: "Events Conducted", value: 24, suffix: "+" },
    { label: "Businesses Listed", value: 20, suffix: "+" },
    { label: "Scholarships Supported", value: 15, suffix: "+" },
    { label: "Cities Connected", value: 50, suffix: "+" },
    { label: "Donations Raised", value: 25, suffix: "L+" },
  ],
  testimonials: [
    {
      id: "1",
      name: "Rohit Sharma",
      batch: "B1",
      house: "Aravali",
      role: "Software Engineer at Microsoft",
      quote: "NNAWCA brought me back to my roots. I found old friends, made new connections, and even found my current job through this community. The house rivalries are still alive!",
      rating: 5,
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    },
    {
      id: "2",
      name: "Dr. Kavita Reddy",
      batch: "B2",
      house: "Nilgiri",
      role: "Senior Cardiologist, AIIMS",
      quote: "The mentorship I received from senior alumni was invaluable during my medical career. Now I mentor the next generation of healthcare professionals. Full circle.",
      rating: 5,
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    },
    {
      id: "3",
      name: "Amit Patel",
      batch: "B4",
      house: "Udaigiri",
      role: "Founder, GreenEarth Organics",
      quote: "Listing my business on NNAWCA was a game-changer. Alumni customers found me, senior entrepreneurs mentored me, and I've hired two Navodayans. Our community is our strength.",
      rating: 5,
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    },
    {
      id: "4",
      name: "Priya Kulkarni",
      batch: "B3",
      house: "Indira",
      role: "Space Scientist, ISRO",
      quote: "From the JNV classroom to launching satellites — the discipline I learned at Navodaya stays with me. NNAWCA helps me give back to the institution that shaped me.",
      rating: 5,
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    },
    {
      id: "5",
      name: "Vikram Singh",
      batch: "B2",
      house: "Shiwalik",
      role: "IAS Officer, Government of India",
      quote: "Some of my strongest professional bonds are with fellow Navodayans. We're in different services, different states, but that JNV connection cuts through everything.",
      rating: 5,
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    },
    {
      id: "6",
      name: "Ananya Deshmukh",
      batch: "B5",
      house: "Laxmi",
      role: "Product Manager, Google",
      quote: "I moved to Bangalore after college and felt completely lost. Then I found the NNAWCA Bangalore chapter. Now I have a community, mentors, and friends who feel like family.",
      rating: 5,
      image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face",
    },
    {
      id: "7",
      name: "Dr. Suresh Reddy",
      batch: "B1",
      house: "Aravali",
      role: "Neurosurgeon, Apollo Hospitals",
      quote: "Forty years after leaving JNV, I still remember every corner of that campus. NNAWCA didn't just connect me with old friends — it connected me with my younger self.",
      rating: 5,
      image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    },
  ],
  houses: [
    {
      id: "aravali",
      name: "Aravali",
      color: "#5a9bd5",
      members: 120,
      gamesPlayed: 48,
      tournamentsWon: 12,
      businesses: 5,
      moneyDonated: 280000,
      paidMembers: 89,
      karma: 2450,
      slogan: "Where Legends Begin",
    },
    {
      id: "nilgiri",
      name: "Nilgiri",
      color: "#70ad47",
      members: 108,
      gamesPlayed: 42,
      tournamentsWon: 9,
      businesses: 4,
      moneyDonated: 220000,
      paidMembers: 76,
      karma: 2100,
      slogan: "Soaring to Excellence",
    },
    {
      id: "shiwalik",
      name: "Shiwalik",
      color: "#e8503a",
      members: 95,
      gamesPlayed: 38,
      tournamentsWon: 14,
      businesses: 6,
      moneyDonated: 190000,
      paidMembers: 68,
      karma: 2300,
      slogan: "Strength in Unity",
    },
    {
      id: "udaigiri",
      name: "Udaigiri",
      color: "#ffe135",
      members: 112,
      gamesPlayed: 45,
      tournamentsWon: 10,
      businesses: 3,
      moneyDonated: 250000,
      paidMembers: 81,
      karma: 2200,
      slogan: "Rise and Shine",
    },
    {
      id: "indira",
      name: "Indira",
      color: "#ff9933",
      members: 78,
      gamesPlayed: 35,
      tournamentsWon: 7,
      businesses: 3,
      moneyDonated: 150000,
      paidMembers: 55,
      karma: 1800,
      slogan: "Grace and Power",
      isGirlsOnly: true,
    },
    {
      id: "laxmi",
      name: "Laxmi",
      color: "#e75480",
      members: 82,
      gamesPlayed: 37,
      tournamentsWon: 8,
      businesses: 4,
      moneyDonated: 170000,
      paidMembers: 60,
      karma: 1950,
      slogan: "Shine with Purpose",
      isGirlsOnly: true,
    },
  ],
  finalCta: {
    title: "The Next Chapter of JNV Starts Here.",
    primaryCta: "Create Account",
    secondaryCta: "Continue with Google",
  },
  footer: {
    columns: [
      {
        title: "Organization",
        links: [
          { label: "About", href: "#" },
          { label: "Committee", href: "#" },
          { label: "Chapters", href: "#" },
        ],
      },
      {
        title: "Community",
        links: [
          { label: "Events", href: "#" },
          { label: "Businesses", href: "#" },
          { label: "Blog", href: "#" },
        ],
      },
      {
        title: "Legal",
        links: [
          { label: "Privacy", href: "#" },
          { label: "Terms", href: "#" },
          { label: "Refund Policy", href: "#" },
        ],
      },
    ],
    contact: {
      email: "contact@nnawca.org",
      socialLinks: [
        { label: "Facebook", url: "#" },
        { label: "Twitter", url: "#" },
        { label: "LinkedIn", url: "#" },
        { label: "Instagram", url: "#" },
      ],
    },
  },
};
