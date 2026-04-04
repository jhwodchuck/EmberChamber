import { sha256 } from "js-sha256";
import nacl from "tweetnacl";
import type { AttachmentEncryptionMode, ContentClass, PrekeyBundle, ProtectionProfile, RetentionMode } from "./index";

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();
const MAX_PRNG_CHUNK_BYTES = 65_536;

let naclPrngConfigured = false;

export type StoredDeviceBundle = PrekeyBundle & {
  privateKeyB64: string;
};

export type EncryptedConversationAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  byteLength: number;
  contentClass: ContentClass;
  retentionMode: RetentionMode;
  protectionProfile: ProtectionProfile;
  previewBlurHash?: string | null;
  encryptionMode: AttachmentEncryptionMode;
  fileKeyB64?: string | null;
  fileIvB64?: string | null;
};

export type EncryptedConversationPayload = {
  version: 1;
  kind: "ember_conversation_v1";
  conversationId: string;
  conversationKind: "direct_message" | "group" | "room";
  historyMode: "device_encrypted";
  senderDisplayName: string;
  text?: string | null;
  attachment?: EncryptedConversationAttachment | null;
  createdAt: string;
  clientMessageId: string;
};

type BoxEnvelope = {
  version: 1;
  nonceB64: string;
  boxB64: string;
};

function ensureNaclPrng() {
  if (naclPrngConfigured) {
    return;
  }

  const cryptoObject = globalThis.crypto as
    | {
        getRandomValues?: (array: Uint8Array) => Uint8Array | void;
      }
    | undefined;

  if (!cryptoObject?.getRandomValues) {
    return;
  }

  nacl.setPRNG((target, size) => {
    for (let offset = 0; offset < size; offset += MAX_PRNG_CHUNK_BYTES) {
      const chunk = new Uint8Array(Math.min(size - offset, MAX_PRNG_CHUNK_BYTES));
      cryptoObject.getRandomValues?.(chunk);
      target.set(chunk, offset);
    }
  });

  naclPrngConfigured = true;
}

function withSecureRandom<T>(operation: () => T): T {
  ensureNaclPrng();

  try {
    return operation();
  } catch (error) {
    if (error instanceof Error && error.message === "no PRNG") {
      throw new Error("Secure random number generation is unavailable in this runtime.");
    }

    throw error;
  }
}

function base64FromBinary(binary: string): string {
  if (typeof btoa === "function") {
    return btoa(binary);
  }

  const nodeBuffer = (globalThis as { Buffer?: { from(input: string, encoding: string): { toString(encoding: string): string } } }).Buffer;
  if (!nodeBuffer) {
    throw new Error("Base64 encoding is unavailable in this runtime.");
  }

  return nodeBuffer.from(binary, "binary").toString("base64");
}

function binaryFromBase64(value: string): string {
  if (typeof atob === "function") {
    return atob(value);
  }

  const nodeBuffer = (globalThis as { Buffer?: { from(input: string, encoding: string): { toString(encoding: string): string } } }).Buffer;
  if (!nodeBuffer) {
    throw new Error("Base64 decoding is unavailable in this runtime.");
  }

  return nodeBuffer.from(value, "base64").toString("binary");
}

export function encodeBytes(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return base64FromBinary(binary);
}

export function decodeBytes(value: string): Uint8Array {
  const binary = binaryFromBase64(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export function toUint8Array(value: ArrayBuffer | Uint8Array): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }

  return new Uint8Array(value);
}

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export function hashSha256B64(value: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof value === "string" ? utf8Encoder.encode(value) : toUint8Array(value);
  return encodeBytes(new Uint8Array(sha256.arrayBuffer(bytes)));
}

export function createStoredDeviceBundle(): StoredDeviceBundle {
  const keyPair = withSecureRandom(() => nacl.box.keyPair());
  const publicKeyB64 = encodeBytes(keyPair.publicKey);

  return {
    identityKeyB64: publicKeyB64,
    signedPrekeyB64: publicKeyB64,
    signedPrekeySignatureB64: hashSha256B64(keyPair.publicKey),
    oneTimePrekeysB64: [],
    privateKeyB64: encodeBytes(keyPair.secretKey),
  };
}

export function toPublicPrekeyBundle(bundle: StoredDeviceBundle | PrekeyBundle): PrekeyBundle {
  return {
    identityKeyB64: bundle.identityKeyB64,
    signedPrekeyB64: bundle.signedPrekeyB64,
    signedPrekeySignatureB64: bundle.signedPrekeySignatureB64,
    oneTimePrekeysB64: bundle.oneTimePrekeysB64,
  };
}

export function isStoredDeviceBundle(value: unknown): value is StoredDeviceBundle {
  if (!value || typeof value !== "object") {
    return false;
  }

  const bundle = value as Partial<StoredDeviceBundle>;
  return (
    typeof bundle.identityKeyB64 === "string" &&
    typeof bundle.signedPrekeyB64 === "string" &&
    typeof bundle.signedPrekeySignatureB64 === "string" &&
    Array.isArray(bundle.oneTimePrekeysB64) &&
    typeof bundle.privateKeyB64 === "string"
  );
}

export function encryptConversationPayload(
  payload: EncryptedConversationPayload,
  recipientIdentityKeyB64: string,
  senderPrivateKeyB64: string,
): string {
  const nonce = withSecureRandom(() => nacl.randomBytes(nacl.box.nonceLength));
  const ciphertext = nacl.box(
    utf8Encoder.encode(JSON.stringify(payload)),
    nonce,
    decodeBytes(recipientIdentityKeyB64),
    decodeBytes(senderPrivateKeyB64),
  );

  const envelope: BoxEnvelope = {
    version: 1,
    nonceB64: encodeBytes(nonce),
    boxB64: encodeBytes(ciphertext),
  };

  return encodeBytes(utf8Encoder.encode(JSON.stringify(envelope)));
}

export function decryptConversationPayload<T>(
  ciphertext: string,
  senderIdentityKeyB64: string,
  recipientPrivateKeyB64: string,
): T {
  const decodedEnvelope = JSON.parse(utf8Decoder.decode(decodeBytes(ciphertext))) as BoxEnvelope;
  const plaintext = nacl.box.open(
    decodeBytes(decodedEnvelope.boxB64),
    decodeBytes(decodedEnvelope.nonceB64),
    decodeBytes(senderIdentityKeyB64),
    decodeBytes(recipientPrivateKeyB64),
  );

  if (!plaintext) {
    throw new Error("Conversation envelope could not be opened.");
  }

  return JSON.parse(utf8Decoder.decode(plaintext)) as T;
}

export function encryptAttachmentBytes(value: ArrayBuffer | Uint8Array) {
  const plaintext = toUint8Array(value);
  const fileKey = withSecureRandom(() => nacl.randomBytes(nacl.secretbox.keyLength));
  const fileIv = withSecureRandom(() => nacl.randomBytes(nacl.secretbox.nonceLength));
  const ciphertext = nacl.secretbox(plaintext, fileIv, fileKey);

  return {
    plaintext: toArrayBuffer(plaintext),
    ciphertext: toArrayBuffer(ciphertext),
    plaintextSha256B64: hashSha256B64(plaintext),
    ciphertextSha256B64: hashSha256B64(ciphertext),
    fileKeyB64: encodeBytes(fileKey),
    fileIvB64: encodeBytes(fileIv),
  };
}

export function decryptAttachmentBytes(
  value: ArrayBuffer | Uint8Array,
  fileKeyB64: string,
  fileIvB64: string,
): Uint8Array {
  const plaintext = nacl.secretbox.open(
    toUint8Array(value),
    decodeBytes(fileIvB64),
    decodeBytes(fileKeyB64),
  );

  if (!plaintext) {
    throw new Error("Attachment ciphertext could not be opened.");
  }

  return plaintext;
}
