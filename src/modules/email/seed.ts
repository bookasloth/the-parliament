import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { SEED_TEMPLATES } from "@/modules/email/templates"

export async function seedEmailTemplates(): Promise<{ inserted: number; updated: number }> {
  let inserted = 0
  let updated = 0

  for (const t of SEED_TEMPLATES) {
    const existing = await prisma.emailTemplate.findUnique({ where: { code: t.code } })
    if (existing) {
      await prisma.emailTemplate.update({
        where: { code: t.code },
        data: {
          subject: t.subject,
          htmlBody: t.html,
          textBody: t.text,
          category: t.category,
          variables: t.variables as Prisma.InputJsonValue,
        },
      })
      updated++
    } else {
      await prisma.emailTemplate.create({
        data: {
          code: t.code,
          subject: t.subject,
          htmlBody: t.html,
          textBody: t.text,
          category: t.category,
          variables: t.variables as Prisma.InputJsonValue,
        },
      })
      inserted++
    }
  }

  return { inserted, updated }
}
