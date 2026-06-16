import nacl from "tweetnacl";
import { decodeBytes, encodeBytes } from "@emberchamber/protocol";

const BUNDLE_VERSION = 1;
const KDF_ITERATIONS = 100_000;

export type EncryptedBackupEnvelope = {
  v: number;
  salt: string;
  nonce: string;
  ciphertext: string;
};

/**
 * Derives a 32-byte key from passphrase + salt via iterated SHA-512.
 * 100k rounds makes brute-force impractical on short passphrases without
 * requiring a native PBKDF2 polyfill that isn't in the Expo SDK.
 */
function deriveKey(passphrase: string, salt: Uint8Array): Uint8Array {
  const passphraseBytes = new TextEncoder().encode(passphrase);

  const initial = new Uint8Array(salt.length + passphraseBytes.length);
  initial.set(salt);
  initial.set(passphraseBytes, salt.length);

  let key = nacl.hash(initial).slice(0, 32);

  for (let i = 1; i < KDF_ITERATIONS; i++) {
    const input = new Uint8Array(
      key.length + passphraseBytes.length + salt.length,
    );
    input.set(key);
    input.set(passphraseBytes, key.length);
    input.set(salt, key.length + passphraseBytes.length);
    key = nacl.hash(input).slice(0, 32);
  }

  return key;
}

export function encryptBackupBundle(
  plaintext: string,
  passphrase: string,
): EncryptedBackupEnvelope {
  const salt = nacl.randomBytes(32);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const key = deriveKey(passphrase, salt);
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const ciphertext = nacl.secretbox(plaintextBytes, nonce, key);

  return {
    v: BUNDLE_VERSION,
    salt: encodeBytes(salt),
    nonce: encodeBytes(nonce),
    ciphertext: encodeBytes(ciphertext),
  };
}

export function decryptBackupBundle(
  envelope: EncryptedBackupEnvelope,
  passphrase: string,
): string {
  if (envelope.v !== BUNDLE_VERSION) {
    throw new Error(`Unsupported backup version: ${envelope.v}`);
  }

  const salt = decodeBytes(envelope.salt);
  const nonce = decodeBytes(envelope.nonce);
  const ciphertext = decodeBytes(envelope.ciphertext);
  const key = deriveKey(passphrase, salt);
  const plaintext = nacl.secretbox.open(ciphertext, nonce, key);

  if (!plaintext) {
    throw new Error("Wrong passphrase or corrupted backup file.");
  }

  return new TextDecoder().decode(plaintext);
}

export function scorePassphrase(passphrase: string): {
  score: 0 | 1 | 2 | 3;
  label: string;
} {
  if (passphrase.length < 8) return { score: 0, label: "Too short" };
  if (passphrase.length < 12) return { score: 1, label: "Weak" };

  const hasUpper = /[A-Z]/.test(passphrase);
  const hasDigit = /[0-9]/.test(passphrase);
  const hasSymbol = /[^A-Za-z0-9]/.test(passphrase);
  const variety = [hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  if (passphrase.length >= 16 && variety >= 2) return { score: 3, label: "Strong" };
  return { score: 2, label: "Fair" };
}
