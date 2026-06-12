import { NextResponse } from "next/server"
// Auth commented out for UI testing
// import { auth } from "@/lib/auth"
// import { prisma } from "@/lib/prisma"

export async function POST() {
  // const session = await auth()
  // if (!session?.user?.id) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  // }

  // const { step, data } = await req.json()
  // if (!step || !data) {
  //   return NextResponse.json({ error: "Missing step or data" }, { status: 400 })
  // }

  // const validSteps = ["verify", "membership", "profile", "connect"]
  // if (!validSteps.includes(step)) {
  //   return NextResponse.json({ error: "Invalid step" }, { status: 400 })
  // }

  // try {
  //   const stepKey = `onboarding_${step}` as const
  //   const existing = await prisma.user.findUnique({
  //     where: { id: session.user.id },
  //     select: { onboardingStep: true, profileCompletion: true },
  //   })

  //   const updates: Record<string, unknown> = {}

  //   if (step === "verify") {
  //     if (data.profilePhoto) updates.profilePhoto = data.profilePhoto
  //     if (data.admissionNumber || data.schoolIdUrl || data.marksheetUrl) {
  //       const verifyData: Record<string, unknown> = {}
  //       if (data.admissionNumber) verifyData.admissionNumber = data.admissionNumber
  //       if (data.schoolIdUrl) verifyData.schoolIdUrl = data.schoolIdUrl
  //       if (data.marksheetUrl) verifyData.marksheetUrl = data.marksheetUrl
  //       updates.verificationData = verifyData
  //     }
  //   }

  //   if (step === "membership" && data.selectedPlan) {
  //     updates.membershipData = { selectedPlan: data.selectedPlan }
  //   }

  //   if (step === "profile") {
  //     const profileFields: Record<string, string | undefined> = {}
  //     if (data.city) profileFields.city = data.city
  //     if (data.profession) profileFields.profession = data.profession
  //     if (data.organization) profileFields.company = data.organization
  //     if (data.designation) profileFields.designation = data.designation
  //     if (data.higherEducation) profileFields.higherEducation = data.higherEducation
  //     if (data.skills) {
  //       profileFields.skills = JSON.stringify(data.skills.split(",").map((s: string) => s.trim()).filter(Boolean))
  //     }
  //     if (data.linkedinUrl) profileFields.linkedinUrl = data.linkedinUrl

  //     if (Object.keys(profileFields).length > 0) {
  //       const profileUpdate: Record<string, unknown> = {}
  //       if (profileFields.city) profileUpdate.city = profileFields.city
  //       if (profileFields.profession) profileUpdate.profession = profileFields.profession
  //       if (profileFields.company) profileUpdate.company = profileFields.company
  //       if (profileFields.designation) profileUpdate.designation = profileFields.designation
  //       if (profileFields.higherEducation) profileUpdate.higherEducation = profileFields.higherEducation
  //       if (profileFields.skills) profileUpdate.skills = JSON.parse(profileFields.skills)
  //       if (profileFields.linkedinUrl) profileUpdate.linkedinUrl = profileFields.linkedinUrl

  //       await prisma.profile.upsert({
  //         where: { userId: session.user.id },
  //         create: { userId: session.user.id, ...profileUpdate },
  //         update: profileUpdate,
  //       })
  //     }

  //     const filledFields = [data.city, data.profession, data.organization, data.designation, data.higherEducation, data.skills, data.linkedinUrl].filter(Boolean).length
  //     const completion = Math.round((filledFields / 7) * 100)
  //     updates.profileCompletion = completion
  //   }

  //   if (step === "connect" && data.connections) {
  //     updates.connectionsData = { connections: data.connections }
  //   }

  //   if (!existing || existing.onboardingStep === step) {
  //     const nextStepIndex = validSteps.indexOf(step) + 1
  //     const nextStep = validSteps[nextStepIndex] || "complete"
  //     updates.onboardingStep = nextStep
  //   }

  //   if (Object.keys(updates).length > 0) {
  //     await prisma.user.update({
  //       where: { id: session.user.id },
  //       data: updates,
  //     })
  //   }

  //   return NextResponse.json({ success: true })
  // } catch (error) {
  //   console.error("Onboarding save error:", error)
  //   return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  // }

  // Mock success for UI testing
  return NextResponse.json({ success: true })
}
