"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import {
  sendConnectionRequest,
  respondToConnection,
} from "@/modules/connections/service"

export async function connectAction(addresseeId: string) {
  const user = await requireUser()
  await sendConnectionRequest(user.id, addresseeId)
  revalidatePath("/connections")
}

export async function acceptAction(connectionId: string) {
  const user = await requireUser()
  await respondToConnection(user.id, connectionId, true)
  revalidatePath("/connections")
}

export async function rejectAction(connectionId: string) {
  const user = await requireUser()
  await respondToConnection(user.id, connectionId, false)
  revalidatePath("/connections")
}
