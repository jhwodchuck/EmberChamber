// Deterministic avatar colors. Telegram/Signal assign each participant a stable
// color derived from their identity so the same person always reads the same way
// across a thread. We hash a stable seed (account id, falling back to name) into
// a fixed palette tuned to sit well on the dark ember background with white text.
//
// This is a verbatim port of apps/mobile/src/lib/avatarColor.ts so a participant
// reads with the same color on both the web and Android surfaces.

const AVATAR_PALETTE = [
  "#e8743b",
  "#d9534f",
  "#c2557a",
  "#9b6dd1",
  "#6d83d1",
  "#3fa7a0",
  "#3f9d57",
  "#b0892e",
  "#cf6679",
  "#5c8fd6",
  "#c96f9b",
  "#7e9b3f",
] as const;

function hashString(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0; // force 32-bit
  }
  return Math.abs(hash);
}

/** Pick a stable palette color for a participant seed (account id or name). */
export function avatarColor(seed: string | null | undefined): string {
  const normalized = (seed ?? "").trim();
  if (!normalized) {
    return AVATAR_PALETTE[0];
  }
  return AVATAR_PALETTE[hashString(normalized) % AVATAR_PALETTE.length];
}

/** First letter for an avatar/monogram, with a stable fallback glyph. */
export function avatarInitial(name: string | null | undefined): string {
  return (name ?? "").trim().charAt(0).toUpperCase() || "#";
}
