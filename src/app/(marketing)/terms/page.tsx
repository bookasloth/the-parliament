import type { Metadata } from "next"
import { LegalDoc } from "@/components/marketing/LegalDoc"

export const metadata: Metadata = {
  title: "Terms of Service — NNAWCA",
  description: "The terms that govern your use of the NNAWCA alumni network and membership.",
}

export default function TermsPage() {
  return (
    <LegalDoc
      eyebrow="Legal"
      title="Terms of Service"
      updated="30 July 2026"
      intro="These terms govern your use of the NNAWCA alumni network. By creating an account or using the platform, you agree to them. They exist to keep the network trustworthy for every alumnus — please read them."
      blocks={[
        {
          heading: "Who can join",
          body: [
            "Membership is open to alumni, students and staff of Jawahar Navodaya Vidyalaya, Nagpur (Navegaon Khairi and Jindi). We verify each member as genuine. Accounts found to be fraudulent or impersonating another person will be removed.",
          ],
        },
        {
          heading: "Real identity",
          body: [
            "The network runs on trust, so we require your real legal name — no pseudonyms or anonymous profiles. You are responsible for keeping your account details accurate and your login secure.",
          ],
        },
        {
          heading: "Membership & payments",
          body: [
            {
              list: [
                "Student membership is free and permanent. Associate and Premium are annual subscriptions; Life is a one-time payment.",
                "Payments are processed securely by Razorpay. Prices are in INR and shown before you pay.",
                "Paid tiers grant the benefits listed on the Membership page for the paid period. Committee Membership is invite-only and not purchasable.",
              ],
            },
          ],
        },
        {
          heading: "Refunds",
          body: [
            "Membership fees and donations are generally non-refundable, as they fund the association's charitable work. If you believe a payment was made in error, contact us within 7 days and we'll review it in good faith.",
          ],
        },
        {
          heading: "How you may use the network",
          body: [
            "The directory and member data are provided for genuine alumni connection only. You agree not to:",
            {
              list: [
                "Scrape, harvest or export member data for marketing or any commercial use.",
                "Send spam, solicitations or unsolicited bulk messages to members.",
                "Harass, impersonate, defame or endanger any member.",
                "Post unlawful, hateful or infringing content, or disrupt the platform's operation.",
              ],
            },
            "We may suspend or remove accounts that breach these rules.",
          ],
        },
        {
          heading: "Your content",
          body: [
            "You keep ownership of what you post. By posting, you grant NNAWCA a licence to display it within the network as part of running the service. You're responsible for what you share and must have the right to share it.",
          ],
        },
        {
          heading: "Donations",
          body: [
            "Donations support the association's scholarships and charitable activities. Receipts are issued for eligible contributions. NNAWCA directs funds toward its stated causes at the committee's reasonable discretion.",
          ],
        },
        {
          heading: "Availability & liability",
          body: [
            "We work to keep the platform available and accurate, but provide it “as is” without warranties. To the extent permitted by law, NNAWCA is not liable for indirect or consequential losses arising from use of the network.",
          ],
        },
        {
          heading: "Disclaimer",
          body: [
            "Content on the network — including member profiles, business listings, the directory and posts — is provided by members and for the alumni community's convenience. NNAWCA does not endorse or guarantee any member, business, job, opinion or offer shared on the platform, and is not a party to dealings between members. Verify independently before acting on anything you find here.",
          ],
        },
        {
          heading: "Changes & governing law",
          body: [
            "We may update these terms as the association evolves; material changes will be notified in-app or by email. These terms are governed by the laws of India, with jurisdiction in the courts of Nagpur, Maharashtra.",
          ],
        },
        {
          heading: "Contact",
          body: [
            "Questions about these terms? Email contact@nnawca.org, or write to NNAWCA, {{registered address}}, Nagpur, Maharashtra, India.",
          ],
        },
      ]}
    />
  )
}
