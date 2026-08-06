import type { Metadata } from "next"
import { LegalDoc } from "@/components/marketing/LegalDoc"

export const metadata: Metadata = {
  title: "Help & Support — NNAWCA",
  description:
    "Answers to common questions about the NNAWCA alumni network — accounts, profiles, membership, groups, events and getting in touch.",
}

export default function HelpPage() {
  return (
    <LegalDoc
      eyebrow="Support"
      title="Help & Support"
      updated="6 August 2026"
      intro="Quick answers to the things alumni ask most. If you can't find what you need here, reach out — a real committee member replies."
      blocks={[
        {
          heading: "Getting started",
          body: [
            "Sign up with your email or Google, then complete the short onboarding: profile, JNV details (batch and house), interests, and an optional membership.",
            "Your account is active immediately. Verification (the blue tick) is reviewed by the committee and confirms you're a genuine JNV Nagpur alumnus.",
          ],
        },
        {
          heading: "Your account & profile",
          body: [
            "Edit anything from your profile page:",
            {
              list: [
                "Photo, cover, headline, and bio.",
                "Batch, house, and current status.",
                "Professional details — company, role, city, and links.",
                "Privacy: control who sees your contact details and whether you appear in the public directory.",
              ],
            },
          ],
        },
        {
          heading: "Membership & payments",
          body: [
            "Membership tiers unlock more of the network. Upgrades follow the order Student → Associate → Premium → Life; Life and Committee are the top tiers.",
            "Payments are handled securely by Razorpay. Invoices are emailed and saved to your account. If a payment succeeds but your tier doesn't update within a few minutes, contact us with your payment reference.",
          ],
        },
        {
          heading: "Groups & events",
          body: [
            "You're automatically pooled into your batch and house groups. Discover and join more from the Groups page.",
            "Events show up under Events — RSVP to the ones you'll attend, and they'll appear under your interested list. Paid events check you out through the same secure flow as membership.",
          ],
        },
        {
          heading: "Privacy & safety",
          body: [
            "Real names are required — no pseudonyms. Report any post or profile that breaks the community rules; the committee reviews reports.",
            "Read the Privacy Policy for what we collect, and the Rules & Regulations for community conduct — both are linked in the sidebar.",
          ],
        },
        {
          heading: "Contact us",
          body: [
            "Still stuck? Email the committee and we'll get back to you. Include your registered email and, for payment issues, the Razorpay reference.",
          ],
        },
      ]}
    />
  )
}
