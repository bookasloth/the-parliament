import type { Metadata } from "next"
import { LegalDoc } from "@/components/marketing/LegalDoc"

export const metadata: Metadata = {
  title: "Privacy Policy — NNAWCA",
  description: "How NNAWCA collects, uses and protects your personal data on the alumni network.",
}

export default function PrivacyPage() {
  return (
    <LegalDoc
      eyebrow="Legal"
      title="Privacy Policy"
      updated="30 July 2026"
      intro="The Nagpur Navodaya Alumni Welfare and Charitable Association (NNAWCA) runs this alumni network. This policy explains what we collect, why, and the control you have over your data. We keep it plain — no dark patterns."
      blocks={[
        {
          heading: "What we collect",
          body: [
            "When you sign up and build your profile, we collect the information you give us:",
            {
              list: [
                "Identity: your legal name, email, phone number and date of birth.",
                "Alumni details: batch, house, school, years studied and current status.",
                "Professional details: your headline, company, location and anything you add to your profile.",
                "Payment records: membership and donation transactions (processed by Razorpay — we never see or store your card or bank credentials).",
              ],
            },
            "We also collect basic technical data — device, browser and log information — to keep the service secure and working.",
          ],
        },
        {
          heading: "Why we use it",
          body: [
            {
              list: [
                "To run your membership, verify you as a genuine alumnus, and show you in the directory to other members.",
                "To process payments, issue receipts, and send you service and event communications.",
                "To keep the network safe — preventing fraud, abuse and impersonation.",
                "To improve the platform based on how it's actually used.",
              ],
            },
          ],
        },
        {
          heading: "Who can see your information",
          body: [
            "Your profile is visible to other verified members of the network according to your privacy settings and membership tier. It is not public to the open internet unless you choose to make specific details public.",
            "We do not sell your data. Ever. We share it only with the service providers that make the platform run — payment (Razorpay), email delivery, and hosting — and only to the extent needed.",
          ],
        },
        {
          heading: "How we protect it",
          body: [
            "Data is encrypted in transit and at rest. Access is restricted to authorised committee members and administrators who need it to run the association. Payment credentials are handled entirely by Razorpay under PCI-DSS standards.",
          ],
        },
        {
          heading: "Your rights",
          body: [
            {
              list: [
                "Access and export the data we hold about you.",
                "Correct anything that's wrong from your profile settings.",
                "Delete your account and associated personal data, subject to records we must retain for legal or financial reasons.",
                "Opt out of non-essential communications at any time.",
              ],
            },
            "To exercise any of these, write to us at the address below.",
          ],
        },
        {
          heading: "Retention",
          body: [
            "We keep your data for as long as your membership is active. After you leave, we retain the minimum required for legal, tax and audit purposes, then delete it.",
          ],
        },
        {
          heading: "Cookies",
          body: [
            "We use a small number of cookies to keep you signed in, remember your preferences, and understand how the platform is used. Essential cookies are required for the service to work; you can decline non-essential ones without losing core functionality. You can clear or block cookies in your browser at any time.",
          ],
        },
        {
          heading: "Contact",
          body: [
            "Questions about this policy or your data? Email contact@nnawca.org, or write to NNAWCA, {{registered address}}, Nagpur, Maharashtra, India.",
          ],
        },
      ]}
    />
  )
}
