const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBinary(bytes: Uint8Array): string {
  let output = "";
  for (const byte of bytes) {
    output += String.fromCharCode(byte);
  }
  return output;
}

function fromBinary(binary: string): Uint8Array {
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function encodeBytes(bytes: Uint8Array): string {
  return btoa(toBinary(bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function decodeBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding =
    normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return fromBinary(atob(normalized + padding));
}

export function encodeJson<T>(value: T): string {
  return encodeBytes(encoder.encode(JSON.stringify(value)));
}

export function decodeJson<T>(value: string): T {
  return JSON.parse(decoder.decode(decodeBytes(value))) as T;
}
