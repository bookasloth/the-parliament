import { NextRequest } from "next/server"
import { z } from "zod"
import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { handleError, ok } from "@/lib/api"
import { requireAdmin } from "@/lib/gate"
import { audit } from "@/lib/audit"

export async function GET() {
  try {
    await requireAdmin()
    const templates = await prisma.emailTemplate.findMany({
      orderBy: [{ category: "asc" }, { code: "asc" }],
    })
    return ok({ templates })
  } catch (e) {
    return handleError(e)
  }
}

const updateSchema = z.object({
  code: z.string().min(1),
  subject: z.string().min(1),
  htmlBody: z.string().min(1),
  textBody: z.string().min(1),
  category: z.string(),
  isActive: z.boolean(),
  variables: z.record(z.string(), z.string()).optional(),
})

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin()
    const body = updateSchema.parse(await req.json())

    const t = await prisma.emailTemplate.upsert({
      where: { code: body.code },
      create: {
        code: body.code,
        subject: body.subject,
        htmlBody: body.htmlBody,
        textBody: body.textBody,
        category: body.category,
        isActive: body.isActive,
        variables: (body.variables ?? {}) as Prisma.InputJsonValue,
        updatedBy: admin.id,
      },
      update: {
        subject: body.subject,
        htmlBody: body.htmlBody,
        textBody: body.textBody,
        category: body.category,
        isActive: body.isActive,
        variables: (body.variables ?? {}) as Prisma.InputJsonValue,
        updatedBy: admin.id,
      },
    })

    await audit({
      actorId: admin.id,
      action: "email.template.update",
      entityType: "email_template",
      entityId: t.id,
      payload: { code: body.code },
    })

    return ok({ template: t })
  } catch (e) {
    return handleError(e)
  }
}
