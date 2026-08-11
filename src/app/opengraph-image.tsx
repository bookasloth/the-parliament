import { renderOgCard, clusterArt, OG_SIZE, OG_CONTENT_TYPE, C } from "@/lib/og"

// Site-wide default OG image — also serves the homepage `/`. Every route without
// its own opengraph-image inherits this.
export const runtime = "nodejs"
export const alt = "NNAWCA — JNV Nagpur Alumni Network"
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return renderOgCard({
    titleLines: [
      { text: "JNV Nagpur" },
      { text: "Alumni Network", color: C.brand },
    ],
    subtitle: "One network. Every batch. Since 2023.",
    right: clusterArt(),
  })
}
