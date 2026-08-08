// Coloured text-post backgrounds — shared by PostComposer (picker) and FeedCard (renderer).
// SVG backgrounds use inline markup rendered as an overlay behind text.

export interface TextBg {
  bg: string
  fg?: string
  svg?: string
}

export interface BgPickerOption {
  id: string
  plain?: boolean
}

// ── Every background the platform knows about ────────────────────────────
// The picker arrays below gate which ones are *offered*; feed cards can
// render any of these regardless of the author's current plan.

export const TEXT_BACKGROUNDS: Record<string, TextBg> = {
  // Gradients
  navy: { bg: "linear-gradient(135deg,#1a3a6b,#0b1c38)" },
  brand: { bg: "linear-gradient(135deg,#009ae4,#005c8c)" },
  sunset: { bg: "linear-gradient(135deg,#ff8a5b,#e75480)" },
  gold: { bg: "linear-gradient(135deg,#ffd119,#d4a800)" },
  forest: { bg: "linear-gradient(135deg,#3ea35f,#1f6b3e)" },
  violet: { bg: "linear-gradient(135deg,#9b6cff,#5a2ec0)" },
  christmas: { bg: "linear-gradient(135deg,#c0392b 0%,#0e7a3a 100%)" },
  tricolour: {
    bg: "linear-gradient(180deg,#FF9933 0%,#FF9933 33%,#ffffff 33%,#ffffff 66%,#138808 66%,#138808 100%)",
    fg: "#1a3a6b",
  },

  // SVG decorative backgrounds
  pink_botanical: {
    bg: "#fde8ee",
    fg: "#880e4f",
    svg: `<svg viewBox="0 0 400 530" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
<defs><linearGradient id="pkl" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e8577a"/><stop offset="100%" stop-color="#c2395a"/></linearGradient><linearGradient id="pks" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f28ba5"/><stop offset="100%" stop-color="#e8577a"/></linearGradient></defs>
<g transform="translate(0,0)"><path d="M-20 60C10 30 40 50 60 20C80-10 100 30 80 60C60 90 30 70 10 90C-10 110-30 80-20 60Z" fill="url(#pks)" opacity=".25"/><path d="M0 0C20-5 50 20 30 50C10 80-10 40 0 0Z" fill="#e8577a" opacity=".15"/><g stroke="#d64672" stroke-width="1.5" fill="none" opacity=".5"><path d="M20 120C40 100 60 80 90 50"/><path d="M90 50C100 40 110 35 125 30"/></g><g transform="translate(40,95)rotate(-35)" opacity=".4"><path d="M0 0C8-20 20-25 28-8C30 0 20 8 0 0Z" fill="url(#pkl)"/><path d="M2-1C10-12 18-14 25-6" stroke="#c2395a" stroke-width=".5" fill="none"/><path d="M8-4L12-14M15-4L17-12M20-3L21-9" stroke="#c2395a" stroke-width=".3" fill="none"/></g><g transform="translate(60,75)rotate(-50)" opacity=".45"><path d="M0 0C6-18 18-22 25-6C27 2 18 8 0 0Z" fill="url(#pkl)"/><path d="M2-1C9-10 16-12 22-5" stroke="#c2395a" stroke-width=".5" fill="none"/><path d="M7-3L10-11M13-3L15-10" stroke="#c2395a" stroke-width=".3" fill="none"/></g><g transform="translate(25,105)rotate(-15)" opacity=".35"><path d="M0 0C10-24 24-30 34-10C36 0 24 10 0 0Z" fill="#e8577a"/><path d="M3-1C12-14 22-18 30-8" stroke="#c2395a" stroke-width=".5" fill="none"/><path d="M9-4L13-16M17-5L20-15M24-4L26-11" stroke="#c2395a" stroke-width=".3" fill="none"/></g><g transform="translate(80,55)rotate(-60)" opacity=".4"><path d="M0 0C5-14 14-17 20-5C21 1 14 6 0 0Z" fill="url(#pks)"/><path d="M2-1C7-8 12-10 17-4" stroke="#c2395a" stroke-width=".4" fill="none"/></g><g transform="translate(100,40)rotate(-70)" opacity=".3"><path d="M0 0C5-12 12-15 18-5C19 1 12 5 0 0Z" fill="#e8577a"/><path d="M2 0C6-7 10-8 15-3" stroke="#c2395a" stroke-width=".4" fill="none"/></g><circle cx="110" cy="32" r="3.5" fill="#e8577a" opacity=".3"/><circle cx="118" cy="28" r="2.5" fill="#f28ba5" opacity=".35"/><circle cx="105" cy="25" r="2" fill="#d64672" opacity=".25"/></g>
<g transform="translate(400,0)scale(-1,1)"><path d="M20 30C50 10 80 40 60 70C40 100 10 60 20 30Z" fill="#f28ba5" opacity=".15"/><path d="M0 80C15 60 40 50 50 70C55 85 35 95 15 100C0 105-10 95 0 80Z" fill="#e8577a" opacity=".12"/><path d="M30 0C45 10 55 5 60 15C65 25 50 30 40 20C30 10 20 5 30 0Z" fill="url(#pks)" opacity=".2"/></g>
<g transform="translate(400,530)scale(-1,-1)"><path d="M-10 40C20 10 60 30 50 60C40 90 0 80-10 40Z" fill="url(#pks)" opacity=".2"/><g stroke="#d64672" stroke-width="1.5" fill="none" opacity=".45"><path d="M10 100C30 80 55 65 85 40"/><path d="M85 40C95 32 105 28 120 22"/></g><g transform="translate(35,80)rotate(-30)" opacity=".4"><path d="M0 0C8-22 22-28 32-10C34 0 22 10 0 0Z" fill="url(#pkl)"/><path d="M3-1C11-13 20-16 28-8" stroke="#c2395a" stroke-width=".5" fill="none"/><path d="M9-4L13-15M17-4L19-13M23-3L25-10" stroke="#c2395a" stroke-width=".3" fill="none"/></g><g transform="translate(55,65)rotate(-55)" opacity=".45"><path d="M0 0C6-16 16-20 24-6C25 2 16 7 0 0Z" fill="#e8577a"/><path d="M2-1C8-9 14-11 20-5" stroke="#c2395a" stroke-width=".4" fill="none"/><path d="M7-3L10-10" stroke="#c2395a" stroke-width=".3" fill="none"/></g><g transform="translate(75,50)rotate(-65)" opacity=".35"><path d="M0 0C5-13 13-16 19-5C20 1 13 5 0 0Z" fill="url(#pks)"/><path d="M2 0C6-7 10-9 16-3" stroke="#c2395a" stroke-width=".4" fill="none"/></g><circle cx="100" cy="30" r="3" fill="#e8577a" opacity=".3"/><circle cx="108" cy="24" r="2" fill="#f28ba5" opacity=".35"/><circle cx="115" cy="20" r="2.5" fill="#d64672" opacity=".25"/></g>
<g transform="translate(0,530)scale(1,-1)"><path d="M-20 40C10 10 45 30 35 60C25 90-10 75-20 40Z" fill="#e8577a" opacity=".15"/><path d="M0 80C20 65 30 70 25 90C20 110 5 105 0 80Z" fill="url(#pks)" opacity=".18"/></g>
<g fill="#d64672"><path d="M340 430L343 420L346 430L356 433L346 436L343 446L340 436L330 433Z" opacity=".25"/><path d="M358 450L360 444L362 450L368 452L362 454L360 460L358 454L352 452Z" opacity=".2"/><path d="M320 460L321.5 456L323 460L327 461.5L323 463L321.5 467L320 463L316 461.5Z" opacity=".15"/><circle cx="350" cy="415" r="1.5" opacity=".2"/><circle cx="365" cy="440" r="1" opacity=".18"/><circle cx="310" cy="470" r="1.2" opacity=".15"/></g>
</svg>`,
  },

  sage_green: {
    bg: "linear-gradient(175deg,#e6efdf 0%,#d0dfc7 60%,#c5d6ba 100%)",
    fg: "#2e5a3a",
    svg: `<svg viewBox="0 0 400 530" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
<defs><linearGradient id="gl1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#5a8a5e"/><stop offset="100%" stop-color="#3d6b42"/></linearGradient><linearGradient id="gl2" x1="0" y1="0" x2=".5" y2="1"><stop offset="0%" stop-color="#6ea06e"/><stop offset="100%" stop-color="#4a7a4e"/></linearGradient></defs>
<g opacity=".07"><polygon points="400,0 260,280 285,280" fill="#3d6b42"/><polygon points="400,40 240,310 265,310" fill="#3d6b42"/><polygon points="400,90 280,340 305,340" fill="#3d6b42"/></g>
<g transform="translate(55,530)"><rect x="-22" y="-65" width="44" height="55" rx="3" fill="#fff" opacity=".6"/><rect x="-24" y="-68" width="48" height="8" rx="2" fill="#fff" opacity=".7"/><ellipse cx="0" cy="-60" rx="18" ry="4" fill="#5a3e28" opacity=".25"/><path d="M0-65C2-120-3-200 5-280" stroke="#4a7a4e" stroke-width="2.5" fill="none" opacity=".5"/><g transform="translate(5,-270)rotate(-15)" opacity=".4"><path d="M0 0C-15-40-10-80 5-100C20-80 25-40 10 0Z" fill="url(#gl1)"/><path d="M5-5C0-40 0-70 5-95" stroke="#3d6b42" stroke-width=".8" fill="none"/><path d="M4-20L-8-30M3-35L-10-48M3-50L-8-62M4-65L-5-75M4-80L0-88" stroke="#3d6b42" stroke-width=".4" fill="none"/><path d="M6-20L18-28M6-35L20-45M6-50L20-60M6-65L17-73M5-80L12-86" stroke="#3d6b42" stroke-width=".4" fill="none"/></g><path d="M5-63C15-100 25-160 40-220" stroke="#4a7a4e" stroke-width="2" fill="none" opacity=".45"/><g transform="translate(42,-210)rotate(15)" opacity=".38"><path d="M0 0C-12-35-8-65 4-85C16-65 20-35 8 0Z" fill="url(#gl2)"/><path d="M4-5C1-30 1-55 4-80" stroke="#3d6b42" stroke-width=".7" fill="none"/><path d="M3-18L-6-26M3-32L-7-42M3-46L-5-55M3-60L-3-67" stroke="#3d6b42" stroke-width=".35" fill="none"/><path d="M5-18L14-24M5-32L16-40M5-46L14-54M5-60L11-66" stroke="#3d6b42" stroke-width=".35" fill="none"/></g><path d="M-3-63C-15-110-25-150-20-200" stroke="#4a7a4e" stroke-width="2" fill="none" opacity=".42"/><g transform="translate(-22,-190)rotate(-30)" opacity=".35"><path d="M0 0C-10-28-6-55 3-70C12-55 16-28 6 0Z" fill="url(#gl1)"/><path d="M3-4C0-25 0-45 3-65" stroke="#3d6b42" stroke-width=".6" fill="none"/><path d="M2-15L-5-22M2-30L-6-38M2-45L-4-52" stroke="#3d6b42" stroke-width=".3" fill="none"/><path d="M4-15L10-20M4-30L12-36M4-45L10-50" stroke="#3d6b42" stroke-width=".3" fill="none"/></g><path d="M-5-63C-8-80-12-95-8-110C-4-100 0-85 2-68" stroke="#5a8a5e" stroke-width="1.5" fill="none" opacity=".35"/><path d="M-8-108C-12-115-6-120-4-112" fill="#6ea06e" opacity=".3"/></g>
<g transform="translate(370,30)rotate(20)" opacity=".25"><path d="M0 0C-8-20-4-40 3-50C10-40 14-20 6 0Z" fill="url(#gl2)"/><path d="M3-3C1-18 1-32 3-46" stroke="#3d6b42" stroke-width=".5" fill="none"/><path d="M2-12L-4-18M2-24L-5-31" stroke="#3d6b42" stroke-width=".3" fill="none"/><path d="M4-12L9-16M4-24L10-29" stroke="#3d6b42" stroke-width=".3" fill="none"/></g>
<g transform="translate(385,60)rotate(40)" opacity=".2"><path d="M0 0C-6-15-3-30 2-38C7-30 10-15 4 0Z" fill="#5a8a5e"/><path d="M2-2C1-13 1-25 2-34" stroke="#3d6b42" stroke-width=".4" fill="none"/></g>
<line x1="0" y1="520" x2="400" y2="520" stroke="#b5c9ad" stroke-width="1" opacity=".3"/>
</svg>`,
  },

  warm_sunflower: {
    bg: "#fef3d0",
    fg: "#6b4e00",
    svg: `<svg viewBox="0 0 400 530" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
<defs><linearGradient id="sf1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f5b800"/><stop offset="100%" stop-color="#d49a00"/></linearGradient><linearGradient id="sf2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fdd835"/><stop offset="100%" stop-color="#f0a500"/></linearGradient><radialGradient id="sc" cx="50%" cy="50%"><stop offset="0%" stop-color="#8b6914"/><stop offset="70%" stop-color="#6b4e00"/><stop offset="100%" stop-color="#5a4000"/></radialGradient></defs>
<g opacity=".04" fill="#8b6914"><circle cx="30" cy="50" r="1.5"/><circle cx="90" cy="120" r="1"/><circle cx="180" cy="80" r="1.3"/><circle cx="250" cy="150" r="1.1"/><circle cx="320" cy="90" r="1.4"/><circle cx="60" cy="200" r="1"/><circle cx="150" cy="280" r="1.2"/><circle cx="280" cy="220" r="1"/><circle cx="350" cy="300" r="1.3"/><circle cx="40" cy="350" r="1.1"/><circle cx="200" cy="400" r="1"/><circle cx="100" cy="450" r="1.4"/><circle cx="300" cy="420" r="1.2"/><circle cx="370" cy="480" r="1"/><circle cx="220" cy="500" r="1.3"/><circle cx="130" cy="160" r=".8"/><circle cx="340" cy="200" r=".9"/><circle cx="70" cy="380" r="1"/></g>
<g transform="translate(345,55)"><g fill="url(#sf1)" opacity=".5"><ellipse cx="0" cy="-32" rx="7" ry="18"/><ellipse cx="0" cy="-32" rx="7" ry="18" transform="rotate(24)"/><ellipse cx="0" cy="-32" rx="7" ry="18" transform="rotate(48)"/><ellipse cx="0" cy="-32" rx="7" ry="18" transform="rotate(72)"/><ellipse cx="0" cy="-32" rx="7" ry="18" transform="rotate(96)"/><ellipse cx="0" cy="-32" rx="7" ry="18" transform="rotate(120)"/><ellipse cx="0" cy="-32" rx="7" ry="18" transform="rotate(144)"/><ellipse cx="0" cy="-32" rx="7" ry="18" transform="rotate(168)"/><ellipse cx="0" cy="-32" rx="7" ry="18" transform="rotate(192)"/><ellipse cx="0" cy="-32" rx="7" ry="18" transform="rotate(216)"/><ellipse cx="0" cy="-32" rx="7" ry="18" transform="rotate(240)"/><ellipse cx="0" cy="-32" rx="7" ry="18" transform="rotate(264)"/><ellipse cx="0" cy="-32" rx="7" ry="18" transform="rotate(288)"/><ellipse cx="0" cy="-32" rx="7" ry="18" transform="rotate(312)"/><ellipse cx="0" cy="-32" rx="7" ry="18" transform="rotate(336)"/></g><g fill="url(#sf2)" opacity=".45"><ellipse cx="0" cy="-22" rx="5" ry="13" transform="rotate(12)"/><ellipse cx="0" cy="-22" rx="5" ry="13" transform="rotate(36)"/><ellipse cx="0" cy="-22" rx="5" ry="13" transform="rotate(60)"/><ellipse cx="0" cy="-22" rx="5" ry="13" transform="rotate(84)"/><ellipse cx="0" cy="-22" rx="5" ry="13" transform="rotate(108)"/><ellipse cx="0" cy="-22" rx="5" ry="13" transform="rotate(132)"/><ellipse cx="0" cy="-22" rx="5" ry="13" transform="rotate(156)"/><ellipse cx="0" cy="-22" rx="5" ry="13" transform="rotate(180)"/><ellipse cx="0" cy="-22" rx="5" ry="13" transform="rotate(204)"/><ellipse cx="0" cy="-22" rx="5" ry="13" transform="rotate(228)"/><ellipse cx="0" cy="-22" rx="5" ry="13" transform="rotate(252)"/><ellipse cx="0" cy="-22" rx="5" ry="13" transform="rotate(276)"/><ellipse cx="0" cy="-22" rx="5" ry="13" transform="rotate(300)"/><ellipse cx="0" cy="-22" rx="5" ry="13" transform="rotate(324)"/></g><circle cx="0" cy="0" r="14" fill="url(#sc)" opacity=".5"/><g fill="#fef3d0" opacity=".3"><circle cx="3" cy="-5" r="1"/><circle cx="-4" cy="-3" r=".8"/><circle cx="1" cy="4" r="1"/><circle cx="-3" cy="5" r=".8"/><circle cx="5" cy="1" r=".9"/><circle cx="-6" cy="-1" r=".7"/><circle cx="0" cy="-8" r=".7"/><circle cx="6" cy="-4" r=".8"/><circle cx="-2" cy="8" r=".7"/><circle cx="7" cy="3" r=".6"/><circle cx="-7" cy="4" r=".7"/><circle cx="3" cy="7" r=".6"/></g></g>
<g transform="translate(370,110)scale(.65)"><g fill="url(#sf1)" opacity=".4"><ellipse cx="0" cy="-28" rx="6" ry="15"/><ellipse cx="0" cy="-28" rx="6" ry="15" transform="rotate(30)"/><ellipse cx="0" cy="-28" rx="6" ry="15" transform="rotate(60)"/><ellipse cx="0" cy="-28" rx="6" ry="15" transform="rotate(90)"/><ellipse cx="0" cy="-28" rx="6" ry="15" transform="rotate(120)"/><ellipse cx="0" cy="-28" rx="6" ry="15" transform="rotate(150)"/><ellipse cx="0" cy="-28" rx="6" ry="15" transform="rotate(180)"/><ellipse cx="0" cy="-28" rx="6" ry="15" transform="rotate(210)"/><ellipse cx="0" cy="-28" rx="6" ry="15" transform="rotate(240)"/><ellipse cx="0" cy="-28" rx="6" ry="15" transform="rotate(270)"/><ellipse cx="0" cy="-28" rx="6" ry="15" transform="rotate(300)"/><ellipse cx="0" cy="-28" rx="6" ry="15" transform="rotate(330)"/></g><g fill="url(#sf2)" opacity=".35"><ellipse cx="0" cy="-20" rx="4.5" ry="11" transform="rotate(15)"/><ellipse cx="0" cy="-20" rx="4.5" ry="11" transform="rotate(45)"/><ellipse cx="0" cy="-20" rx="4.5" ry="11" transform="rotate(75)"/><ellipse cx="0" cy="-20" rx="4.5" ry="11" transform="rotate(105)"/><ellipse cx="0" cy="-20" rx="4.5" ry="11" transform="rotate(135)"/><ellipse cx="0" cy="-20" rx="4.5" ry="11" transform="rotate(165)"/><ellipse cx="0" cy="-20" rx="4.5" ry="11" transform="rotate(195)"/><ellipse cx="0" cy="-20" rx="4.5" ry="11" transform="rotate(225)"/><ellipse cx="0" cy="-20" rx="4.5" ry="11" transform="rotate(255)"/><ellipse cx="0" cy="-20" rx="4.5" ry="11" transform="rotate(285)"/><ellipse cx="0" cy="-20" rx="4.5" ry="11" transform="rotate(315)"/><ellipse cx="0" cy="-20" rx="4.5" ry="11" transform="rotate(345)"/></g><circle cx="0" cy="0" r="11" fill="url(#sc)" opacity=".45"/><g fill="#fef3d0" opacity=".25"><circle cx="2" cy="-4" r=".8"/><circle cx="-3" cy="-2" r=".7"/><circle cx="1" cy="3" r=".8"/><circle cx="-2" cy="4" r=".7"/><circle cx="4" cy="1" r=".6"/><circle cx="-5" cy="0" r=".6"/></g></g>
<g transform="translate(325,30)scale(.4)" opacity=".8"><g fill="#d49a00" opacity=".3"><ellipse cx="0" cy="-24" rx="5" ry="13"/><ellipse cx="0" cy="-24" rx="5" ry="13" transform="rotate(40)"/><ellipse cx="0" cy="-24" rx="5" ry="13" transform="rotate(80)"/><ellipse cx="0" cy="-24" rx="5" ry="13" transform="rotate(120)"/><ellipse cx="0" cy="-24" rx="5" ry="13" transform="rotate(160)"/><ellipse cx="0" cy="-24" rx="5" ry="13" transform="rotate(200)"/><ellipse cx="0" cy="-24" rx="5" ry="13" transform="rotate(240)"/><ellipse cx="0" cy="-24" rx="5" ry="13" transform="rotate(280)"/><ellipse cx="0" cy="-24" rx="5" ry="13" transform="rotate(320)"/></g><circle cx="0" cy="0" r="9" fill="#6b4e00" opacity=".35"/></g>
<g transform="translate(25,490)" opacity=".2"><g transform="rotate(-20)"><path d="M0 0C8-22 18-28 26-10C28 0 18 8 0 0Z" fill="#6b8e23"/><path d="M2-1C9-12 15-15 22-8" stroke="#556b2f" stroke-width=".5" fill="none"/><path d="M7-3L10-12M14-3L16-11" stroke="#556b2f" stroke-width=".3" fill="none"/></g><g transform="translate(15,-5)rotate(-45)"><path d="M0 0C6-16 14-20 20-7C21 1 14 6 0 0Z" fill="#7ba428"/><path d="M2 0C6-8 11-11 17-5" stroke="#556b2f" stroke-width=".4" fill="none"/><path d="M6-2L8-9" stroke="#556b2f" stroke-width=".25" fill="none"/></g><path d="M5 5L0 0" stroke="#6b8e23" stroke-width="1.2" opacity=".3"/><path d="M5 5L18-3" stroke="#6b8e23" stroke-width="1" opacity=".25"/></g>
</svg>`,
  },
}

// ── Picker options per tier ──────────────────────────────────────────────

const PLAIN: BgPickerOption = { id: "plain", plain: true }

export const STUDENT_BG_PICKER: BgPickerOption[] = [
  PLAIN,
  { id: "navy" }, { id: "brand" }, { id: "sunset" }, { id: "gold" },
  { id: "forest" }, { id: "violet" }, { id: "christmas" }, { id: "tricolour" },
]

export const DEFAULT_BG_PICKER: BgPickerOption[] = [
  PLAIN,
  { id: "navy" }, { id: "sunset" }, { id: "violet" },
  { id: "pink_botanical" }, { id: "sage_green" }, { id: "warm_sunflower" },
]
