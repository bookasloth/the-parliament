"use client"

import { useState } from "react"
import {
  X,
  Users,
  ChevronRight,
  Sparkles,
  Home,
  Plus,
  Calendar,
  Menu,
} from "lucide-react"
import { FeedCard, avatarColors, type FeedPost } from "@/components/shared/FeedCard"
import { ComposeTrigger } from "@/components/shared/ComposeTrigger"
import { reactToPost, commentOnPost } from "./actions"

interface Connection {
  name: string
  role: string
  avatar: string
  hasStory?: boolean
}

// --- Data ---
export const MOCK_POSTS: FeedPost[] = [
  {
    id: "1",
    name: "Shubham Datarkar",
    headline: "Web Developer at TCS",
    batch: "21st batch (2006–2013)",
    location: "Nagpur, India",
    house: { name: "Shivaji", color: avatarColors.blue },
    membership: "associate",
    isVerified: true,
    timestamp: "2h",
    content: [
      "It's a reminder:",
      "Of early mornings, late nights,",
      "Near-falls and never-quits.",
      "This isn't a photo.",
      "It's proof that passion, when disciplined,",
      "doesn't just play — it wins.",
      "",
      "via @rahulsharma #Cricket #Sports",
    ].join("\n"),
    images: [
      "https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=800&fit=crop",
    ],
    mediaCount: 4,
    upvotes: 56,
    downvotes: 12,
    comments: 55,
    shares: 3,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    borderType: "blue",
    memberSince: "2024",
    connections: 342,
    posts: 28,
  },
  {
    id: "2",
    name: "Neha Gupta",
    headline: "IAS Officer · Government of India",
    batch: "20th batch (2005–2012)",
    location: "Lucknow, India",
    house: { name: "Shivaji", color: avatarColors.gold },
    membership: "life",
    isVerified: true,
    isEdited: true,
    timestamp: "Edited 2h ago",
    question: "What if every decision you made was driven by empathy?",
    upvotes: 256,
    downvotes: 3,
    comments: 112,
    shares: 67,
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face",
    borderType: "gold",
    memberSince: "2021",
    connections: 1243,
    posts: 87,
  },
  {
    id: "3",
    name: "Priya Sharma",
    headline: "Software Engineer at Google",
    batch: "23rd batch (2008–2015)",
    location: "Bangalore, India",
    house: { name: "Tagore", color: avatarColors.darkBlue },
    membership: "premium",
    isVerified: true,
    timestamp: "4h",
    poll: {
      question: "Which tech stack should our alumni mentorship focus on?",
      options: [
        "AI / Machine Learning",
        "Full Stack Web Development",
        "Cloud & DevOps",
        "Mobile App Development",
      ],
    },
    upvotes: 128,
    downvotes: 5,
    comments: 67,
    shares: 23,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    borderType: "darkBlue",
    memberSince: "2023",
    connections: 567,
    posts: 42,
  },
  {
    id: "4",
    name: "Dr. Amit Verma",
    headline: "Cardiologist · AIIMS Delhi",
    batch: "15th batch (2000–2007)",
    location: "Delhi, India",
    house: { name: "Raman", color: avatarColors.rgby },
    membership: "committee",
    isVerified: true,
    isPinned: true,
    timestamp: "1d",
    quote: {
      text: "The good physician treats the disease; the great physician treats the patient who has the disease. In JNV, we learned not just subjects, but humanity.",
      author: "Dr. William Osler",
      source: "The Principles and Practice of Medicine",
    },
    upvotes: 312,
    downvotes: 1,
    comments: 89,
    shares: 45,
    avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&crop=face",
    borderType: "rgby",
    memberSince: "2020",
    connections: 891,
    posts: 156,
  },
  {
    id: "5",
    name: "Rahul Mehta",
    headline: "Product Designer at Figma",
    batch: "24th batch (2009–2016)",
    location: "Mumbai, India",
    house: { name: "Tagore", color: avatarColors.green },
    membership: "student",
    isEdited: true,
    timestamp: "5 Aug 2025",
    content:
      "Building this project for NNAWCA with the confidence of a YouTube ad that says 'No experience required.'",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=800&fit=crop",
    videoDuration: "01:25",
    upvotes: 134,
    downvotes: 8,
    comments: 45,
    shares: 22,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    borderType: "green",
    memberSince: "2024",
    connections: 234,
    posts: 18,
  },
  {
    id: "6",
    name: "Vikram Singh",
    headline: "Founder & CEO · EduStart",
    batch: "18th batch (2003–2010)",
    location: "Pune, India",
    house: { name: "Raman", color: avatarColors.grey },
    membership: "inactive",
    isVerified: true,
    timestamp: "6h",
    content:
      "Just closed our Series A! Grateful to the JNV Nagpur alumni network for the early support and mentorship. To every Navodayan dreaming of building something — start today.\n\n#Startup #Entrepreneurship #JNVAlumni",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=800&fit=crop",
    upvotes: 445,
    downvotes: 2,
    comments: 156,
    shares: 89,
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    borderType: "grey",
    memberSince: "2019",
    connections: 2100,
    posts: 312,
  },
]

const connections: Connection[] = [
  { name: "Judy Nguyen", role: "News Anchor · Nagpur", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face" },
  { name: "Amanda Reed", role: "Web Developer · Mumbai", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face", hasStory: true },
  { name: "Billy Vasquez", role: "News Anchor · Delhi", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face" },
  { name: "Shubham Datarkar", role: "Web Developer · NNAWCA", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face" },
  { name: "Carolyn Ortiz", role: "News Anchor · Pune", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face" },
]

const newsItems = [
  { title: "Alumni Reunion 2026 — Save the Date: October 15th", time: "2h" },
  { title: "Featured Alumni: Dr. Amit Verma's Journey in Medicine", time: "3h" },
  { title: "Exclusive Job Postings for Alumni — View Openings", time: "4h" },
  { title: "Mentorship Program: Help Current Students as an Alumni Mentor", time: "6h" },
  { title: "Campus Updates: See What's New at Your Alma Mater", time: "1d" },
]

// --- Left Sidebar ---
function LeftSidebar({ userName }: { userName: string }) {
  return (
    <div className="space-y-3">
      {/* Profile Card */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="h-[50px] bg-gradient-to-r from-brand to-brand-700" />
        <div className="px-4 pt-0 pb-3">
          <div className="text-center">
            <div className="avatar avatar-lg -mt-6 mb-2 mx-auto">
              <img
                className="h-16 w-16 rounded-full border-2 border-white object-cover"
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face"
                alt=""
              />
            </div>
            <h6 className="text-sm font-semibold text-gray-900 mb-0">
              <a href="#!" className="hover:text-brand transition-colors">{userName}</a>
            </h6>
            <small className="text-xs text-gray-500">Co-founder at Grey Hawks Media</small>
            <div className="flex items-center justify-center gap-3 mt-3">
              <div className="text-center">
                <h6 className="text-xs font-semibold text-gray-900 mb-0">21st</h6>
                <small className="text-[10px] text-gray-500">Batch</small>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <h6 className="text-xs font-semibold text-gray-900 mb-0">Udaigiri</h6>
                <small className="text-[10px] text-gray-500">House</small>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-100 py-2 text-center">
          <a href="#!" className="text-xs font-medium text-brand hover:text-brand-600 transition-colors">Edit Profile</a>
        </div>
      </div>

      {/* Helper Links */}
      <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-gray-500 leading-tight px-2">
        {["About NNAWCA", "Settings", "Help", "nnawca.com", "Privacy Policy", "Terms and Conditions"].map((link, i) => (
          <li key={i}>
            <a href="#!" className="hover:text-brand transition-colors whitespace-nowrap">{link}</a>
          </li>
        ))}
      </ul>

      {/* Powered By */}
      <div className="text-center text-[11px] text-gray-400">
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <span>Powered by</span>
          <span className="font-semibold text-gray-500">NNAWCA</span>
          <span>for JNV Nagpur Alumni</span>
        </div>
      </div>

      {/* Copyright */}
      <p className="text-[10px] text-center text-gray-400 mt-1 leading-relaxed">
        2022-2026 &copy; All Rights Reserved by NNAWCA<br />
        Made by <a href="https://shubhamdatarkar.in/nnawca" target="_blank" className="text-brand hover:underline">Mr. The Kalamwala</a>
      </p>
    </div>
  )
}

// --- FeedContent ---
export function FeedContent({
  userName,
  posts = MOCK_POSTS,
}: {
  userName: string
  posts?: FeedPost[]
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f3f2ef] pb-16 lg:pb-0">
      {/* Offcanvas backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Offcanvas Sidebar (mobile) */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-xl transition-transform lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-end p-3 border-b border-gray-100">
          <button onClick={() => setSidebarOpen(false)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-53px)] px-3 py-4">
          <LeftSidebar userName={userName} />
        </div>
      </div>

      {/* Feed Layout */}
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar - desktop only */}
          <div className="hidden lg:block w-full lg:w-[280px] flex-shrink-0">
            <div className="sticky top-20">
              <LeftSidebar userName={userName} />
            </div>
          </div>

          {/* Feed Column */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Standard compose trigger */}
            <ComposeTrigger />

            {posts.map((post) => {
              const isReal = post.id.length > 10 // real DB rows use UUIDs; mock rows use "1".."6"
              return (
                <FeedCard
                  key={post.id}
                  post={post}
                  onUpvote={
                    isReal
                      ? () => {
                          void reactToPost(post.id, "upvote")
                        }
                      : undefined
                  }
                  onComment={
                    isReal
                      ? (body) => {
                          void commentOnPost(post.id, body)
                        }
                      : undefined
                  }
                />
              )
            })}

            {/* Premium CTA */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-sm font-medium text-gray-700">
                <Sparkles className="inline h-4 w-4 text-brand mr-1" />
                Unlock more with Premium Membership
              </p>
              <a
                href="premium-membership.html"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-600 transition-colors"
              >
                Learn more <ChevronRight className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-full lg:w-[340px] flex-shrink-0">
            <div className="sticky top-20 space-y-3">
              {/* Sticky Ad */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-4">
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Sponsored</span>
                  <a href="https://www.google.com" target="_blank" className="mt-2 block">
                    <img src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&h=400&fit=crop" alt="Ad" className="w-full rounded object-cover" />
                  </a>
                  <p className="mt-1.5 text-xs text-gray-400 text-center">Advertisement</p>
                </div>
              </div>

              {/* Connections Widget */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h5 className="text-sm font-semibold text-gray-900">Throw 1 Egg to Poke Them</h5>
                </div>
                <div className="py-1">
                  {connections.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors">
                      <div className={`h-9 w-9 flex-shrink-0 overflow-hidden rounded-full ${c.hasStory ? "ring-2 ring-brand-200" : ""}`}>
                        <img src={c.avatar} alt={c.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{c.name}</p>
                        <p className="truncate text-xs text-gray-500">{c.role}</p>
                      </div>
                      <button
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500 hover:bg-amber-100 transition-colors"
                        title="Throw egg"
                      >
                        🥚
                      </button>
                    </div>
                  ))}
                </div>
                <a
                  href="directory.html#id=new-joined"
                  className="block text-center py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors border-t border-gray-100"
                >
                  View more
                </a>
              </div>

              {/* Alumni News */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h5 className="text-sm font-semibold text-gray-900">Alumni News</h5>
                </div>
                <div className="divide-y divide-gray-50">
                  {newsItems.map((item, i) => (
                    <div key={i} className="px-4 py-2.5 hover:bg-gray-50 transition-colors">
                      <h6 className="text-xs font-medium leading-snug text-gray-700 line-clamp-2">
                        <a href="blog-details.html" className="hover:text-brand transition-colors">{item.title}</a>
                      </h6>
                      <span className="text-[10px] text-gray-400 mt-0.5 block">{item.time}</span>
                    </div>
                  ))}
                </div>
                <button className="flex items-center justify-center gap-1.5 w-full py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors border-t border-gray-100">
                  View all news
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 lg:hidden safe-area-bottom">
        <div className="flex items-center justify-around py-1.5">
          <button className="flex flex-col items-center gap-0.5 text-brand px-3 py-1">
            <Home className="h-5 w-5" />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600 px-3 py-1">
            <Users className="h-5 w-5" />
            <span className="text-[10px] font-medium">Network</span>
          </button>
          <a href="/compose" className="flex flex-col items-center gap-0.5 text-gray-400 px-3 py-1 -mt-3">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-brand to-brand-700 flex items-center justify-center shadow-md">
              <Plus className="h-5 w-5 text-white" />
            </div>
          </a>
          <button className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600 px-3 py-1">
            <Calendar className="h-5 w-5" />
            <span className="text-[10px] font-medium">Events</span>
          </button>
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600 px-3 py-1"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
