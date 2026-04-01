import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EmberChamber",
    short_name: "EmberChamber",
    description: "Invite-only encrypted messaging for trusted circles.",
    start_url: "/",
    display: "standalone",
    background_color: "#fcf7f2",
    theme_color: "#c85832",
    icons: [
      {
        src: "/brand/emberchamber-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
