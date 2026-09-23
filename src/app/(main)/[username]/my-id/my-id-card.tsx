"use client"

import { IDCardLanyard } from "@/components/ui/id-card-lanyard"

interface MyIDCardProps {
  name: string
  role: string
  brand: string
  brandTagline: string
  pillars: [string, string, string]
  location: string
  idNumber: string
  validThru: string
  site: string
  photoUrl?: string
  linkedinUrl?: string
  instagramUrl?: string
  githubUrl?: string
  footerTagline: string
}

export function MyIDCard(props: MyIDCardProps) {
  return (
    <IDCardLanyard
      {...props}
      anchorX="50%"
      anchorY={6}
      zIndex={40}
      showHint
    />
  )
}
