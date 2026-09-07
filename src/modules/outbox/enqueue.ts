import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"

/**
 * Enqueue an outbox intent (audit IP-5). Pass a transaction client as `client`
 * to write the intent inside the producer's own `$transaction` — then the side
 * effect can never be lost relative to the core write (either both commit or
 * neither). Called without a client it enqueues on its own connection.
 *
 * `dedupeKey` coalesces: while a matching row is pending, more enqueues pile up
 * but the drain runs the handler once for the whole group (e.g. every vote on an
 * author's posts → one ranking recompute). Omit it to never coalesce.
 */
export async function enqueueOutbox(
  input: { type: string; payload?: Record<string, unknown>; dedupeKey?: string },
  client: Pick<typeof prisma, "outboxEvent"> = prisma,
): Promise<void> {
  await client.outboxEvent.create({
    data: {
      type: input.type,
      // Callers pass a JSON-serializable object; cast to Prisma's JSON input.
      payload: (input.payload ?? {}) as Prisma.InputJsonValue,
      dedupeKey: input.dedupeKey ?? null,
    },
  })
}
