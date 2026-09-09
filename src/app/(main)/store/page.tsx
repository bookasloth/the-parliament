import { AdRail } from "@/components/shared/AdRail"
import StoreClient from "./store-client"

export const metadata = { title: "Shell Store — NNAWCA" }

// Server wrapper: the store UI is client-side (Razorpay checkout), so the ad
// rail is rendered here and passed in as a slot.
export default function ShellStorePage() {
  return <StoreClient adRail={<AdRail set="content" />} />
}
