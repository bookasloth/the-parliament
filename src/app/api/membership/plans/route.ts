import { ok } from "@/lib/api"
import { listPublicPlans } from "@/modules/membership/service"

export async function GET() {
  return ok({ plans: listPublicPlans() })
}
