/**
 * NNAWCA committee roster — Executive Committee (11) + 4 sub-committees (3 each).
 * {{PLACEHOLDER}} names/emails/phones — swap with the real roster round-2.
 * Shared by the About committee preview and the /committee page.
 */

export interface Member {
  name: string
  position: string
  email?: string
  phone?: string
}

export interface SubCommittee {
  name: string
  /** accent index 0 blue · 1 red · 2 yellow · 3 green */
  accent: 0 | 1 | 2 | 3
  members: Member[]
}

export const EXECUTIVE: Member[] = [
  { name: "{{Name}}", position: "President", email: "president@nnawca.org", phone: "+91 {{}}" },
  { name: "{{Name}}", position: "Vice President", email: "vicepresident@nnawca.org", phone: "+91 {{}}" },
  { name: "{{Name}}", position: "General Secretary", email: "secretary@nnawca.org", phone: "+91 {{}}" },
  { name: "{{Name}}", position: "Joint Secretary", email: "jointsecretary@nnawca.org", phone: "+91 {{}}" },
  { name: "{{Name}}", position: "Treasurer", email: "treasurer@nnawca.org", phone: "+91 {{}}" },
  { name: "{{Name}}", position: "Joint Treasurer", email: "jointtreasurer@nnawca.org", phone: "+91 {{}}" },
  { name: "{{Name}}", position: "Executive Member", email: "member@nnawca.org", phone: "+91 {{}}" },
  { name: "{{Name}}", position: "Executive Member", email: "member@nnawca.org", phone: "+91 {{}}" },
  { name: "{{Name}}", position: "Executive Member", email: "member@nnawca.org", phone: "+91 {{}}" },
  { name: "{{Name}}", position: "Executive Member", email: "member@nnawca.org", phone: "+91 {{}}" },
  { name: "{{Name}}", position: "Executive Member", email: "member@nnawca.org", phone: "+91 {{}}" },
]

export const SUB_COMMITTEES: SubCommittee[] = [
  {
    name: "Tech & Media",
    accent: 0,
    members: [
      { name: "{{Name}}", position: "Head", email: "tech@nnawca.org", phone: "+91 {{}}" },
      { name: "{{Name}}", position: "Member", email: "tech@nnawca.org", phone: "+91 {{}}" },
      { name: "{{Name}}", position: "Member", email: "tech@nnawca.org", phone: "+91 {{}}" },
    ],
  },
  {
    name: "Culture",
    accent: 1,
    members: [
      { name: "{{Name}}", position: "Head", email: "culture@nnawca.org", phone: "+91 {{}}" },
      { name: "{{Name}}", position: "Member", email: "culture@nnawca.org", phone: "+91 {{}}" },
      { name: "{{Name}}", position: "Member", email: "culture@nnawca.org", phone: "+91 {{}}" },
    ],
  },
  {
    name: "Alumni Relations",
    accent: 3,
    members: [
      { name: "{{Name}}", position: "Head", email: "relations@nnawca.org", phone: "+91 {{}}" },
      { name: "{{Name}}", position: "Member", email: "relations@nnawca.org", phone: "+91 {{}}" },
      { name: "{{Name}}", position: "Member", email: "relations@nnawca.org", phone: "+91 {{}}" },
    ],
  },
  {
    name: "Election",
    accent: 2,
    members: [
      { name: "{{Name}}", position: "Head", email: "election@nnawca.org", phone: "+91 {{}}" },
      { name: "{{Name}}", position: "Member", email: "election@nnawca.org", phone: "+91 {{}}" },
      { name: "{{Name}}", position: "Member", email: "election@nnawca.org", phone: "+91 {{}}" },
    ],
  },
]
