import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NNAWCA | JNV Nagpur Alumni Network",
    short_name: "NNAWCA",
    description: "The official alumni network of JNV Nagpur.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#009ae4",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }
}
