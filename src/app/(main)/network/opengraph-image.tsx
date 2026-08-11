import { renderOgCard, directoryArt, OG_SIZE, OG_CONTENT_TYPE, C } from "@/lib/og"

export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = "NNAWCA Alumni Directory"

export default function Image() {
  return renderOgCard({
    titleLines: [{ text: "Alumni" }, { text: "Directory", color: C.brand }],
    subtitle: "Batchmates, groups & alumni businesses — all in one place.",
    right: directoryArt(),
  })
}
