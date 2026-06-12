export const ONBOARDING_STEPS = ["profile", "jnv", "interests", "membership", "complete"] as const
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

export const STEP_INDEX: Record<OnboardingStep, number> = {
  profile: 0,
  jnv: 1,
  interests: 2,
  membership: 3,
  complete: 4,
}

export const STEP_LABELS: Record<string, string> = {
  profile: "Profile",
  jnv: "JNV Details",
  interests: "Interests",
  membership: "Membership",
  complete: "Done",
}

export interface ProfileData {
  mobile: string
  gender: string
  dob: string
  city: string
  profession: string
  bio: string
}

export interface JnvData {
  schoolId: string
  batchYear: string
  houseId: string
  yearsStudied: string
  currentStatus: string
}

export interface InterestsData {
  interestIds: string[]
}

export interface MembershipData {
  selectedPlan: string | null
}

export interface OnboardingData {
  profile: ProfileData
  jnv: JnvData
  interests: InterestsData
  membership: MembershipData
}

export const EMPTY_ONBOARDING: OnboardingData = {
  profile: {
    mobile: "",
    gender: "",
    dob: "",
    city: "",
    profession: "",
    bio: "",
  },
  jnv: {
    schoolId: "",
    batchYear: "",
    houseId: "",
    yearsStudied: "",
    currentStatus: "",
  },
  interests: {
    interestIds: [],
  },
  membership: {
    selectedPlan: null,
  },
}

export const STATUS_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "alumni", label: "Alumni" },
  { value: "teacher", label: "Teacher" },
  { value: "staff", label: "Staff" },
] as const

export const INTEREST_OPTIONS = [
  { slug: "mentorship", name: "Mentorship" },
  { slug: "networking", name: "Networking" },
  { slug: "jobs", name: "Jobs" },
  { slug: "business", name: "Business" },
  { slug: "events", name: "Events" },
  { slug: "donations", name: "Donations" },
  { slug: "volunteering", name: "Volunteering" },
] as const

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
] as const

export const MEMBERSHIP_PLANS = {
  annual: { label: "Annual Membership", price: "₹499 / year", duration: "1 year" },
  lifetime: { label: "Lifetime Membership", price: "₹2,999", duration: "Lifetime" },
} as const

export const MEMBERSHIP_BENEFITS = [
  { title: "Verified Alumni Badge", icon: "badge" },
  { title: "Access to Alumni Directory", icon: "book" },
  { title: "Attend Events", icon: "calendar" },
  { title: "Voting Rights", icon: "check" },
  { title: "Alumni Networking", icon: "users" },
  { title: "Jobs & Business Opportunities", icon: "briefcase" },
] as const
