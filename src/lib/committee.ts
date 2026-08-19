/**
 * NNAWCA committee roster — Executive Committee (10) + 4 sub-committees (3 each).
 * {{PLACEHOLDER}} names/emails/phones — swap with the real roster round-2.
 * Shared by the About committee preview and the /committee page.
 */

export interface Member {
  name: string
  position: string
  email?: string
  phone?: string
  /** Stable slug used to attach an admin-uploaded photo (see committee-photos). */
  key?: string
  /** Headshot URL — set from the admin photo store, else an initial avatar. */
  photo?: string
}

export interface SubCommittee {
  name: string
  /** accent index 0 blue · 1 red · 2 yellow · 3 green */
  accent: 0 | 1 | 2 | 3
  members: Member[]
}

// PLACEHOLDER names — a randomly-generated roster so the layout is populated.
// These are NOT real office-bearers. Replace every name with the real elected
// roster before this page goes public. Cards render initials avatars (no photos).
export const EXECUTIVE: Member[] = [
  { key: "president", name: "Prince Jiwani Khoja", position: "President", email: "president@nnawca.org" },
  { key: "vice-president", name: "Aditya Rane", position: "Vice President", email: "vicepresident@nnawca.org" },
  { key: "general-secretary", name: "Sameer Kulkarni", position: "General Secretary", email: "secretary@nnawca.org" },
  { key: "joint-secretary", name: "Rohit Deshpande", position: "Joint Secretary", email: "jointsecretary@nnawca.org" },
  { key: "treasurer", name: "Nikhil Warhade", position: "Treasurer", email: "treasurer@nnawca.org" },
  { key: "joint-treasurer", name: "Amol Thakre", position: "Joint Treasurer", email: "jointtreasurer@nnawca.org" },
  { key: "member-1", name: "Vishal Gaikwad", position: "Executive Member", email: "member@nnawca.org" },
  { key: "member-2", name: "Kiran Sonkusare", position: "Executive Member", email: "member@nnawca.org" },
  { key: "member-3", name: "Anjali Deshmukh", position: "Executive Member", email: "member@nnawca.org" },
  { key: "member-4", name: "Sneha Pawar", position: "Executive Member", email: "member@nnawca.org" },
]

// Advisory Committee — past office-bearers ("Ex" roles).
export const ADVISORY: Member[] = [
  { name: "Shri. Chandrashekhar Gotmare", position: "Ex President" },
  { name: "Shri. Pushpaketan Chouragade", position: "Ex Vice President" },
  { name: "Shri. Mahendra Shende", position: "Ex General Secretary" },
  { name: "Shri. Prashant Bodkhe", position: "Ex Joint Secretary" },
  { name: "Shri. Prakash Nare", position: "Ex Treasurer" },
  { name: "Shri. Pandurang Gavkhare", position: "Ex Member" },
  { name: "Shri. Pravin Dongare", position: "Ex Member" },
  { name: "Smt. Megha Amrute", position: "Ex Member" },
  { name: "Shri. Ratnapal Bhandare", position: "Ex Member" },
  { name: "Smt. Shilpa Borkar", position: "Ex Member" },
  { name: "Shri. Shubham Bansod", position: "Ex Member" },
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
