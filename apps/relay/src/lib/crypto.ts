import { decodeBytes, encodeBytes } from "./base64url";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function importAesKey(secret: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", keyMaterial, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return hex(new Uint8Array(digest));
}

export async function blindIndex(secret: string, value: string): Promise<string> {
  const key = await importHmacKey(secret);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return hex(new Uint8Array(digest));
}

export async function encryptString(secret: string, plaintext: string): Promise<string> {
  const key = await importAesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plaintext));
  const merged = new Uint8Array(iv.length + ciphertext.byteLength);
  merged.set(iv, 0);
  merged.set(new Uint8Array(ciphertext), iv.length);
  return encodeBytes(merged);
}

export async function decryptString(secret: string, payload: string): Promise<string> {
  const data = decodeBytes(payload);
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);
  const key = await importAesKey(secret);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return decoder.decode(plaintext);
}

export async function signValue(secret: string, value: string): Promise<string> {
  const key = await importHmacKey(secret);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return encodeBytes(new Uint8Array(digest));
}
