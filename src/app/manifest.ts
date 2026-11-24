import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CBT SMA Muhipo — Ujian Berbasis Komputer",
    short_name: "CBT Muhipo",
    description: "Sistem Ujian Berbasis Komputer Modern SMA Muhammadiyah 1 Ponorogo",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f8fafc",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/pic_logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/pic_logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
