import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "EmberChamber",
    short_name: "EmberChamber",
    description: "Invite-only encrypted messaging for trusted circles.",
    start_url: "/",
    scope: "/",
    lang: "en",
    categories: ["communication", "social"],
    display: "standalone",
    background_color: "#fcf7f2",
    theme_color: "#c85832",
    icons: [
      {
        src: "/brand/emberchamber-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/brand/emberchamber-mark-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/emberchamber-mark-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/emberchamber-mark-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
