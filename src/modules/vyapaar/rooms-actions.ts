"use server"

import { redirect } from "next/navigation"
import { requireUser } from "@/modules/auth/session"
import { ForbiddenError } from "@/lib/errors"
import { createRoom, joinRoom, leaveRoom, setRoomVisibility } from "@/modules/vyapaar/rooms"

export async function createRoomAction(visibility: "private" | "public") {
  const user = await requireUser()
  const { code } = await createRoom(user.id, visibility)
  redirect(`/games/vyapaar/rooms/${code}`)
}

export async function joinRoomAction(code: string): Promise<{ ok: false; error: string } | void> {
  const user = await requireUser()
  const clean = code.trim().toUpperCase()
  try {
    await joinRoom(user.id, clean)
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, error: e.message }
    throw e
  }
  redirect(`/games/vyapaar/rooms/${clean}`)
}

export async function leaveRoomAction(roomId: string) {
  const user = await requireUser()
  await leaveRoom(user.id, roomId)
  redirect("/games/vyapaar")
}

export async function setVisibilityAction(roomId: string, visibility: "private" | "public") {
  const user = await requireUser()
  try {
    await setRoomVisibility(user.id, roomId, visibility)
    return { ok: true as const }
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false as const, error: e.message }
    throw e
  }
}
