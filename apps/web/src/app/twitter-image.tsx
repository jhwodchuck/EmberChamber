export { alt, contentType, default, size } from "./opengraph-image";

// Purely static content (no per-request data) — required explicitly for
// `output: "export"` compatibility (the desktop static-export build). Must
// be declared directly in this file; Next.js route-segment config cannot be
// re-exported from another module.
export const dynamic = "force-static";
