"use client"

import { useState } from "react"
import {
  ArrowLeft, Globe, Users, Briefcase, MapPin, Calendar, ExternalLink,
  Bell, BellOff, Share2, MoreHorizontal, ShieldCheck, UserPlus,
  Home, Menu, Plus, X, Building2, Star, ChevronRight,
} from "lucide-react"

const company = {
  slug: "tata-consultancy-services",
  name: "Tata Consultancy Services",
  shortName: "TCS",
  tagline: "Building on belief",
  industry: "Information Technology & Services",
  size: "10,000+ employees",
  founded: "1968",
  location: "Mumbai, Maharashtra",
  website: "https://www.tcs.com",
  logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop",
  cover: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1400&h=500&fit=crop",
  followers: 248,
  alumniCount: 12,
  about: "TCS is a global leader in IT services, consulting and business solutions. Among the alumni of JNV Nagpur who work or have worked here, many have built remarkable careers spanning software development, enterprise consulting, and leadership roles.",
}

const alumniAtCompany = [
  { id: "1", name: "Shubham Datarkar", role: "Web Developer", batch: "21st", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face", houseColor: "#D4A017", since: "2020" },
  { id: "2", name: "Rohan Sharma", role: "Senior Consultant", batch: "19th", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face", houseColor: "#5a9bd5", since: "2016" },
  { id: "3", name: "Ananya Singh", role: "Project Manager", batch: "18th", avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=face", houseColor: "#70ad47", since: "2014" },
  { id: "4", name: "Karan Joshi", role: "Data Engineer", batch: "22nd", avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop&crop=face", houseColor: "#ff9933", since: "2019" },
]

const jobOpenings = [
  { title: "Senior Software Developer", location: "Mumbai / Remote", type: "Full-time", posted: "3 days ago", applicants: 42 },
  { title: "Cloud Architect", location: "Bangalore", type: "Full-time", posted: "1 week ago", applicants: 28 },
  { title: "Business Analyst", location: "Pune", type: "Full-time", posted: "2 weeks ago", applicants: 67 },
]

const recentPosts = [
  { author: "Shubham Datarkar", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face", text: "Completed 4 years at TCS! Grateful for the projects and team I've worked with. The journey from JNV to corporate India has been incredible.", time: "2 days ago", likes: 34 },
  { author: "Rohan Sharma", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face", text: "TCS awarded us the 'Best Innovation Team' this quarter. Proud of what we built! #TCS #Innovation", time: "1 week ago", likes: 56 },
]

export default function CompanyPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [following, setFollowing] = useState(false)
  const [activeTab, setActiveTab] = useState<"overview" | "alumni" | "jobs" | "posts">("overview")

  return (
    <div className="min-h-screen bg-[#f3f2ef] pb-16 lg:pb-0">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className={`fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-xl transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex justify-end p-3 border-b"><button onClick={() => setSidebarOpen(false)}><X className="h-5 w-5 text-gray-400" /></button></div>
      </div>

      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[52px] max-w-[1000px] items-center gap-3 px-4 sm:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"><Menu className="h-5 w-5 text-gray-600" /></button>
          <a href="/directory" className="flex items-center gap-1.5 text-gray-500 hover:text-brand transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium hidden sm:inline">Directory</span>
          </a>
          <span className="text-sm font-semibold text-gray-900 truncate">{company.shortName}</span>
        </div>
      </header>

      <div className="mx-auto max-w-[1000px] px-0 sm:px-6 py-0 sm:py-5 space-y-0 sm:space-y-4">
        {/* Hero Card */}
        <div className="bg-white border-0 sm:border border-gray-200 rounded-none sm:rounded-xl overflow-hidden">
          {/* Cover */}
          <div className="relative h-36 sm:h-48">
            <img src={company.cover} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>

          <div className="px-4 sm:px-6 pb-5">
            <div className="flex items-end justify-between -mt-8 mb-4">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-white shadow-md border border-gray-100 flex items-center justify-center flex-shrink-0">
                <img src={company.logo} alt={company.name} className="h-12 w-12 sm:h-16 sm:w-16 rounded-lg object-cover" />
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-full border border-gray-200 text-gray-400 hover:text-brand hover:border-brand transition-colors">
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setFollowing(!following)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all ${following ? "bg-gray-100 text-gray-700 border border-gray-200" : "bg-brand text-white hover:bg-brand-600 shadow-sm"}`}>
                  {following ? <><BellOff className="h-4 w-4" /> Following</> : <><Bell className="h-4 w-4" /> Follow</>}
                </button>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{company.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{company.tagline}</p>

            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{company.industry}</span>
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{company.size}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{company.location}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Founded {company.founded}</span>
            </div>

            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span className="font-medium text-gray-900">{company.followers}</span> followers ·
              <span className="font-medium text-brand">{company.alumniCount}</span> JNV Nagpur alumni
              <a href={company.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-brand hover:text-brand-600 transition-colors ml-auto">
                <Globe className="h-3.5 w-3.5" /> Website <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t border-gray-100 flex overflow-x-auto scrollbar-none">
            {(["overview", "alumni", "jobs", "posts"] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`flex-shrink-0 px-5 py-3 text-xs font-semibold border-b-2 transition-colors capitalize ${activeTab === t ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                {t === "alumni" ? `Alumni (${company.alumniCount})` : t === "jobs" ? `Jobs (${jobOpenings.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 sm:px-0">
          {/* Overview */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">About</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{company.about}</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Alumni at {company.shortName}</h3>
                  <button onClick={() => setActiveTab("alumni")} className="text-xs font-medium text-brand hover:text-brand-600 transition-colors">See all</button>
                </div>
                <div className="flex -space-x-2 mb-3">
                  {alumniAtCompany.slice(0, 5).map(a => (
                    <img key={a.id} src={a.avatar} alt={a.name}
                      className="h-9 w-9 rounded-full object-cover border-2 border-white"
                      style={{ outline: `1.5px solid ${a.houseColor}` }}
                    />
                  ))}
                  {company.alumniCount > 5 && (
                    <div className="h-9 w-9 rounded-full bg-brand-50 border-2 border-white flex items-center justify-center">
                      <span className="text-[11px] font-semibold text-brand">+{company.alumniCount - 5}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">{company.alumniCount} JNV Nagpur alumni work here</p>
              </div>

              {jobOpenings.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Open Positions</h3>
                    <button onClick={() => setActiveTab("jobs")} className="text-xs font-medium text-brand hover:text-brand-600 transition-colors">View all</button>
                  </div>
                  <div className="space-y-2">
                    {jobOpenings.slice(0, 2).map((j, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{j.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{j.location} · {j.type}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Alumni */}
          {activeTab === "alumni" && (
            <div className="space-y-3">
              {alumniAtCompany.map(a => (
                <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
                  <img src={a.avatar} alt={a.name}
                    className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                    style={{ border: `2px solid ${a.houseColor}` }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{a.name}</p>
                    <p className="text-xs text-gray-500">{a.role}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{a.batch} Batch · Since {a.since}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`/messages/new`} className="p-2 rounded-full border border-gray-200 text-gray-400 hover:text-brand hover:border-brand transition-colors">
                      <MessageSquare className="h-4 w-4" />
                    </a>
                    <button className="flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors">
                      <UserPlus className="h-3.5 w-3.5" /> Connect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Jobs */}
          {activeTab === "jobs" && (
            <div className="space-y-3">
              {jobOpenings.map((j, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900">{j.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">{company.name}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{j.location}</span>
                        <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{j.type}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Posted {j.posted}</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{j.applicants} applicants</span>
                      </div>
                    </div>
                    <button className="flex-shrink-0 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition-colors">
                      Apply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Posts */}
          {activeTab === "posts" && (
            <div className="space-y-3">
              {recentPosts.map((p, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <img src={p.avatar} alt={p.author} className="h-9 w-9 rounded-full object-cover" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{p.author}</p>
                      <p className="text-xs text-gray-400">{p.time}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{p.text}</p>
                  <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
                    <Star className="h-3.5 w-3.5" /> {p.likes} upvotes
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 lg:hidden">
        <div className="flex items-center justify-around py-1.5">
          <a href="/feed" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Home className="h-5 w-5" /><span className="text-[10px] font-medium">Home</span></a>
          <a href="/connections" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Users className="h-5 w-5" /><span className="text-[10px] font-medium">Network</span></a>
          <span className="flex flex-col items-center px-3 py-1 -mt-3">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-brand to-brand-700 flex items-center justify-center shadow-md"><Plus className="h-5 w-5 text-white" /></div>
          </span>
          <a href="/events" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Calendar className="h-5 w-5" /><span className="text-[10px] font-medium">Events</span></a>
          <button onClick={() => setSidebarOpen(true)} className="flex flex-col items-center gap-0.5 text-gray-400 px-3 py-1"><Menu className="h-5 w-5" /><span className="text-[10px] font-medium">Menu</span></button>
        </div>
      </nav>
    </div>
  )
}

function MessageSquare({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
}
