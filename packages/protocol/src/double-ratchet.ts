import nacl from "tweetnacl";
import { sha256 } from "js-sha256";
import { encodeBytes, decodeBytes } from "./e2ee";

// ---------------------------------------------------------------------------
// Cryptographic Primitives (HMAC-SHA256 & HKDF-SHA256)
// ---------------------------------------------------------------------------

export function hmacSha256(key: Uint8Array, data: Uint8Array): Uint8Array {
  return new Uint8Array(sha256.hmac.arrayBuffer(key, data) as ArrayBuffer) as Uint8Array;
}

export function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Uint8Array {
  return hmacSha256(salt, ikm);
}

export function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Uint8Array {
  const okm = new Uint8Array(length);
  let t: any = new Uint8Array(0);
  let offset = 0;
  let counter = 1;

  while (offset < length) {
    const chunkInput = new Uint8Array(t.length + info.length + 1);
    chunkInput.set(t, 0);
    chunkInput.set(info, t.length);
    chunkInput.set([counter], t.length + info.length);
    t = hmacSha256(prk, chunkInput);

    const bytesToWrite = Math.min(t.length, length - offset);
    okm.set(t.subarray(0, bytesToWrite), offset);
    offset += bytesToWrite;
    counter++;
  }

  return okm;
}

export function hkdfSha256(
  ikm: Uint8Array,
  length: number,
  salt: Uint8Array = new Uint8Array(32),
  info: Uint8Array = new Uint8Array(0),
): Uint8Array {
  const prk = hkdfExtract(salt, ikm);
  return hkdfExpand(prk, info, length);
}

// Diffie-Hellman on Curve25519
export function diffieHellman(privateKeyB64: string, publicKeyB64: string): Uint8Array {
  const secretKey = decodeBytes(privateKeyB64);
  const publicKey = decodeBytes(publicKeyB64);
  return nacl.scalarMult(secretKey, publicKey) as Uint8Array;
}

// ---------------------------------------------------------------------------
// X3DH Implementation
// ---------------------------------------------------------------------------

const X3DH_INFO = new TextEncoder().encode("EmberChamberX3DH");
const X3DH_SALT = new Uint8Array(32); // 32 zero bytes

export function computeX3dhAlice(args: {
  ourIdentityPrivateB64: string;
  ourEphemeralPrivateB64: string;
  peerIdentityPublicB64: string;
  peerSignedPrekeyPublicB64: string;
  peerOneTimePrekeyPublicB64?: string | null;
}): Uint8Array {
  const dh1 = diffieHellman(args.ourIdentityPrivateB64, args.peerSignedPrekeyPublicB64);
  const dh2 = diffieHellman(args.ourEphemeralPrivateB64, args.peerIdentityPublicB64);
  const dh3 = diffieHellman(args.ourEphemeralPrivateB64, args.peerSignedPrekeyPublicB64);

  let ikm: Uint8Array;
  if (args.peerOneTimePrekeyPublicB64) {
    const dh4 = diffieHellman(args.ourEphemeralPrivateB64, args.peerOneTimePrekeyPublicB64);
    ikm = new Uint8Array(dh1.length + dh2.length + dh3.length + dh4.length);
    ikm.set(dh1, 0);
    ikm.set(dh2, dh1.length);
    ikm.set(dh3, dh1.length + dh2.length);
    ikm.set(dh4, dh1.length + dh2.length + dh3.length);
  } else {
    ikm = new Uint8Array(dh1.length + dh2.length + dh3.length);
    ikm.set(dh1, 0);
    ikm.set(dh2, dh1.length);
    ikm.set(dh3, dh1.length + dh2.length);
  }

  return hkdfSha256(ikm, 32, X3DH_SALT, X3DH_INFO);
}

export function computeX3dhBob(args: {
  ourIdentityPrivateB64: string;
  ourSignedPrekeyPrivateB64: string;
  peerIdentityPublicB64: string;
  peerEphemeralPublicB64: string;
  ourOneTimePrekeyPrivateB64?: string | null;
}): Uint8Array {
  const dh1 = diffieHellman(args.ourSignedPrekeyPrivateB64, args.peerIdentityPublicB64);
  const dh2 = diffieHellman(args.ourIdentityPrivateB64, args.peerEphemeralPublicB64);
  const dh3 = diffieHellman(args.ourSignedPrekeyPrivateB64, args.peerEphemeralPublicB64);

  let ikm: Uint8Array;
  if (args.ourOneTimePrekeyPrivateB64) {
    const dh4 = diffieHellman(args.ourOneTimePrekeyPrivateB64, args.peerEphemeralPublicB64);
    ikm = new Uint8Array(dh1.length + dh2.length + dh3.length + dh4.length);
    ikm.set(dh1, 0);
    ikm.set(dh2, dh1.length);
    ikm.set(dh3, dh1.length + dh2.length);
    ikm.set(dh4, dh1.length + dh2.length + dh3.length);
  } else {
    ikm = new Uint8Array(dh1.length + dh2.length + dh3.length);
    ikm.set(dh1, 0);
    ikm.set(dh2, dh1.length);
    ikm.set(dh3, dh1.length + dh2.length);
  }

  return hkdfSha256(ikm, 32, X3DH_SALT, X3DH_INFO);
}

// ---------------------------------------------------------------------------
// Double Ratchet Protocol State Machine
// ---------------------------------------------------------------------------

export interface DoubleRatchetSessionState {
  peerDeviceId: string;
  rk: string; // root key, base64
  ckSend: string | null; // sending chain key, base64
  ckRecv: string | null; // receiving chain key, base64
  ourDhPublicKey: string; // our current ratchet DH public key, base64
  ourDhPrivateKey: string; // our current ratchet DH private key, base64
  peerDhPublicKey: string | null; // peer's current ratchet DH public key, base64
  nSend: number;
  nRecv: number;
  pn: number;
  skippedMessageKeys: Record<string, string>; // key: "dh_pub_b64:index" -> message_key_b64
}

const CONST_CK_SEND = new Uint8Array([1]);
const CONST_CK_RECV = new Uint8Array([2]);
const DR_INFO = new TextEncoder().encode("EmberChamberRatchetRK");

export class DoubleRatchetSession {
  private state: DoubleRatchetSessionState;

  constructor(state: DoubleRatchetSessionState) {
    this.state = state;
  }

  static initAlice(args: {
    peerDeviceId: string;
    sharedMasterKey: Uint8Array;
    peerDhPublicKeyB64: string;
  }): DoubleRatchetSession {
    const ourKeyPair = nacl.box.keyPair();
    const dhOut = nacl.scalarMult(ourKeyPair.secretKey, decodeBytes(args.peerDhPublicKeyB64));

    // [RK, CK_Send] = KDF_RK(SK, DH(our_dh, peer_dh))
    const okm = hkdfSha256(dhOut, 64, args.sharedMasterKey, DR_INFO);
    const rk = okm.slice(0, 32);
    const ckSend = okm.slice(32, 64);

    return new DoubleRatchetSession({
      peerDeviceId: args.peerDeviceId,
      rk: encodeBytes(rk),
      ckSend: encodeBytes(ckSend),
      ckRecv: null,
      ourDhPublicKey: encodeBytes(ourKeyPair.publicKey),
      ourDhPrivateKey: encodeBytes(ourKeyPair.secretKey),
      peerDhPublicKey: args.peerDhPublicKeyB64,
      nSend: 0,
      nRecv: 0,
      pn: 0,
      skippedMessageKeys: {},
    });
  }

  static initBob(args: {
    peerDeviceId: string;
    sharedMasterKey: Uint8Array;
    ourSignedPrekeyKeyPair: nacl.BoxKeyPair;
  }): DoubleRatchetSession {
    return new DoubleRatchetSession({
      peerDeviceId: args.peerDeviceId,
      rk: encodeBytes(args.sharedMasterKey),
      ckSend: null,
      ckRecv: null,
      ourDhPublicKey: encodeBytes(args.ourSignedPrekeyKeyPair.publicKey),
      ourDhPrivateKey: encodeBytes(args.ourSignedPrekeyKeyPair.secretKey),
      peerDhPublicKey: null,
      nSend: 0,
      nRecv: 0,
      pn: 0,
      skippedMessageKeys: {},
    });
  }

  getState(): DoubleRatchetSessionState {
    return this.state;
  }

  encrypt(plaintext: Uint8Array): {
    ciphertext: Uint8Array;
    dhPub: Uint8Array;
    n: number;
    pn: number;
  } {
    if (!this.state.ckSend) {
      throw new Error("Double Ratchet sending chain not initialized.");
    }

    const ck = decodeBytes(this.state.ckSend);
    // [CK, MK] = KDF_CK(CK)
    const mk = hmacSha256(ck, CONST_CK_SEND);
    const nextCk = hmacSha256(ck, CONST_CK_RECV);

    this.state.ckSend = encodeBytes(nextCk);
    const messageIndex = this.state.nSend;
    this.state.nSend += 1;

    // Encrypt with MK using nacl.secretbox
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const cipherbytes = nacl.secretbox(plaintext, nonce, mk);

    // Box message envelope: prepending nonce to ciphertext for transport
    const transportBytes = new Uint8Array(nonce.length + cipherbytes.length);
    transportBytes.set(nonce, 0);
    transportBytes.set(cipherbytes, nonce.length);

    return {
      ciphertext: transportBytes,
      dhPub: decodeBytes(this.state.ourDhPublicKey),
      n: messageIndex,
      pn: this.state.pn,
    };
  }

  decrypt(args: {
    ciphertext: Uint8Array;
    dhPubB64: string;
    n: number;
    pn: number;
  }): Uint8Array {
    const skippedKey = `${args.dhPubB64}:${args.n}`;
    if (this.state.skippedMessageKeys[skippedKey]) {
      const mk = decodeBytes(this.state.skippedMessageKeys[skippedKey]);
      delete this.state.skippedMessageKeys[skippedKey];
      return this.decryptSymmetric(args.ciphertext, mk);
    }

    if (args.dhPubB64 !== this.state.peerDhPublicKey) {
      this.skipMessageKeys(args.pn);
      this.dhRatchetStep(args.dhPubB64);
    }

    this.skipMessageKeys(args.n);

    // Step receiving chain
    if (!this.state.ckRecv) {
      throw new Error("Double Ratchet receiving chain not initialized.");
    }
    const ck = decodeBytes(this.state.ckRecv);
    const mk = hmacSha256(ck, CONST_CK_SEND);
    const nextCk = hmacSha256(ck, CONST_CK_RECV);

    this.state.ckRecv = encodeBytes(nextCk);
    this.state.nRecv += 1;

    return this.decryptSymmetric(args.ciphertext, mk);
  }

  private decryptSymmetric(transportBytes: Uint8Array, mk: Uint8Array): Uint8Array {
    const nonceLength = nacl.secretbox.nonceLength;
    if (transportBytes.length < nonceLength) {
      throw new Error("Invalid symmetric ciphertext package.");
    }

    const nonce = transportBytes.subarray(0, nonceLength);
    const cipherbytes = transportBytes.subarray(nonceLength);

    const plaintext = nacl.secretbox.open(cipherbytes, nonce, mk);
    if (!plaintext) {
      throw new Error("Decryption failed. Invalid message key or corrupted ciphertext.");
    }

    return plaintext;
  }

  private dhRatchetStep(peerDhPubB64: string) {
    this.state.pn = this.state.nSend;
    this.state.nSend = 0;
    this.state.nRecv = 0;
    this.state.peerDhPublicKey = peerDhPubB64;

    const rk = decodeBytes(this.state.rk);
    const dhOut1 = nacl.scalarMult(decodeBytes(this.state.ourDhPrivateKey), decodeBytes(peerDhPubB64));

    // [RK, CK_Recv] = KDF_RK(RK, DH(our_dh, peer_dh))
    const okm1 = hkdfSha256(dhOut1, 64, rk, DR_INFO);
    const nextRk1 = okm1.slice(0, 32);
    const ckRecv = okm1.slice(32, 64);

    this.state.rk = encodeBytes(nextRk1);
    this.state.ckRecv = encodeBytes(ckRecv);

    // Generate new key pair
    const nextKeyPair = nacl.box.keyPair();
    this.state.ourDhPublicKey = encodeBytes(nextKeyPair.publicKey);
    this.state.ourDhPrivateKey = encodeBytes(nextKeyPair.secretKey);

    const dhOut2 = nacl.scalarMult(nextKeyPair.secretKey, decodeBytes(peerDhPubB64));

    // [RK, CK_Send] = KDF_RK(RK, DH(our_dh, peer_dh))
    const okm2 = hkdfSha256(dhOut2, 64, nextRk1, DR_INFO);
    const nextRk2 = okm2.slice(0, 32);
    const ckSend = okm2.slice(32, 64);

    this.state.rk = encodeBytes(nextRk2);
    this.state.ckSend = encodeBytes(ckSend);
  }

  private skipMessageKeys(untilIndex: number) {
    const MAX_SKIPPED_KEYS = 1000;
    if (this.state.nRecv + 100 < untilIndex) {
      throw new Error("Too many skipped messages.");
    }

    if (!this.state.ckRecv) {
      return;
    }

    let ck = decodeBytes(this.state.ckRecv);
    while (this.state.nRecv < untilIndex) {
      const mk = hmacSha256(ck, CONST_CK_SEND);
      const nextCk = hmacSha256(ck, CONST_CK_RECV);

      const peerDhPub = this.state.peerDhPublicKey;
      if (!peerDhPub) {
        break;
      }

      const key = `${peerDhPub}:${this.state.nRecv}`;
      this.state.skippedMessageKeys[key] = encodeBytes(mk);

      // Enforce maximum buffer limit to avoid memory exhaustion attacks
      const keys = Object.keys(this.state.skippedMessageKeys);
      if (keys.length > MAX_SKIPPED_KEYS) {
        delete this.state.skippedMessageKeys[keys[0]];
      }

      ck = nextCk;
      this.state.nRecv += 1;
    }

    this.state.ckRecv = encodeBytes(ck);
  }
}

// ---------------------------------------------------------------------------
// Sender Keys Protocol Implementation
// ---------------------------------------------------------------------------

export interface SenderKeyDistributionMessage {
  kind: "ember_sender_key_distribution_v1";
  groupId: string;
  senderDeviceId: string;
  iteration: number;
  chainKeyB64: string;
  signaturePublicKeyB64: string;
}

export interface GroupMessageEnvelope {
  version: 3;
  groupId: string;
  senderDeviceId: string;
  iteration: number;
  ciphertextB64: string;
  signatureB64: string;
}

export interface SenderKeyState {
  groupId: string;
  senderDeviceId: string;
  iteration: number;
  chainKeyB64: string;
  signaturePublicKeyB64: string;
  signaturePrivateKeyB64?: string; // only present if we are the sender
  skippedMessageKeys: Record<string, string>; // iteration -> messageKeyB64
  sharedWithDeviceIds?: string[]; // to track key distribution status
}

const CONST_SENDER_KEY_MK = new Uint8Array([3]);
const CONST_SENDER_KEY_CK = new Uint8Array([4]);

export class SenderKeySession {
  private state: SenderKeyState;

  constructor(state: SenderKeyState) {
    this.state = state;
  }

  static create(groupId: string, senderDeviceId: string): SenderKeySession {
    const chainKey = nacl.randomBytes(32);
    const signatureKeyPair = nacl.sign.keyPair();

    return new SenderKeySession({
      groupId,
      senderDeviceId,
      iteration: 0,
      chainKeyB64: encodeBytes(chainKey),
      signaturePublicKeyB64: encodeBytes(signatureKeyPair.publicKey),
      signaturePrivateKeyB64: encodeBytes(signatureKeyPair.secretKey),
      skippedMessageKeys: {},
    });
  }

  getState(): SenderKeyState {
    return this.state;
  }

  makeDistributionMessage(): SenderKeyDistributionMessage {
    return {
      kind: "ember_sender_key_distribution_v1",
      groupId: this.state.groupId,
      senderDeviceId: this.state.senderDeviceId,
      iteration: this.state.iteration,
      chainKeyB64: this.state.chainKeyB64,
      signaturePublicKeyB64: this.state.signaturePublicKeyB64,
    };
  }

  encrypt(plaintext: Uint8Array): {
    ciphertext: Uint8Array;
    iteration: number;
    signature: Uint8Array;
  } {
    if (!this.state.signaturePrivateKeyB64) {
      throw new Error("Cannot encrypt: missing private signing key.");
    }

    const ck = decodeBytes(this.state.chainKeyB64);
    const mk = hmacSha256(ck, CONST_SENDER_KEY_MK);
    const nextCk = hmacSha256(ck, CONST_SENDER_KEY_CK);

    // Save next chain key state
    this.state.chainKeyB64 = encodeBytes(nextCk);
    const currentIteration = this.state.iteration;
    this.state.iteration += 1;

    // Encrypt using nacl.secretbox
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const cipherbytes = nacl.secretbox(plaintext, nonce, mk);

    const transportBytes = new Uint8Array(nonce.length + cipherbytes.length);
    transportBytes.set(nonce, 0);
    transportBytes.set(cipherbytes, nonce.length);

    // Sign the transportBytes
    const privateKey = decodeBytes(this.state.signaturePrivateKeyB64);
    const signature = nacl.sign.detached(transportBytes, privateKey);

    return {
      ciphertext: transportBytes,
      iteration: currentIteration,
      signature,
    };
  }

  decrypt(args: {
    ciphertext: Uint8Array;
    iteration: number;
    signature: Uint8Array;
  }): Uint8Array {
    // 1. Verify signature using Ed25519 public key
    const publicKey = decodeBytes(this.state.signaturePublicKeyB64);
    const verified = nacl.sign.detached.verify(args.ciphertext, args.signature, publicKey);
    if (!verified) {
      throw new Error("Sender Key message signature verification failed.");
    }

    // 2. Check if we skipped this message previously
    const skippedKey = String(args.iteration);
    if (this.state.skippedMessageKeys[skippedKey]) {
      const mk = decodeBytes(this.state.skippedMessageKeys[skippedKey]);
      delete this.state.skippedMessageKeys[skippedKey];
      return this.decryptSymmetric(args.ciphertext, mk);
    }

    if (args.iteration < this.state.iteration) {
      throw new Error("Sender Key message is too old / replay attack.");
    }

    // 3. Skip missing keys if needed
    this.skipMessageKeys(args.iteration);

    // 4. Retrieve message key and step key
    const ck = decodeBytes(this.state.chainKeyB64);
    const mk = hmacSha256(ck, CONST_SENDER_KEY_MK);
    const nextCk = hmacSha256(ck, CONST_SENDER_KEY_CK);

    this.state.chainKeyB64 = encodeBytes(nextCk);
    this.state.iteration += 1;

    return this.decryptSymmetric(args.ciphertext, mk);
  }

  private decryptSymmetric(transportBytes: Uint8Array, mk: Uint8Array): Uint8Array {
    const nonceLength = nacl.secretbox.nonceLength;
    if (transportBytes.length < nonceLength) {
      throw new Error("Invalid symmetric group ciphertext package.");
    }

    const nonce = transportBytes.subarray(0, nonceLength);
    const cipherbytes = transportBytes.subarray(nonceLength);

    const plaintext = nacl.secretbox.open(cipherbytes, nonce, mk);
    if (!plaintext) {
      throw new Error("Group decryption failed. Invalid message key.");
    }

    return plaintext;
  }

  private skipMessageKeys(untilIteration: number) {
    const MAX_SKIPPED_KEYS = 1000;
    if (this.state.iteration + 100 < untilIteration) {
      throw new Error("Too many skipped group messages.");
    }

    let ck = decodeBytes(this.state.chainKeyB64);
    while (this.state.iteration < untilIteration) {
      const mk = hmacSha256(ck, CONST_SENDER_KEY_MK);
      const nextCk = hmacSha256(ck, CONST_SENDER_KEY_CK);

      const key = String(this.state.iteration);
      this.state.skippedMessageKeys[key] = encodeBytes(mk);

      const keys = Object.keys(this.state.skippedMessageKeys);
      if (keys.length > MAX_SKIPPED_KEYS) {
        delete this.state.skippedMessageKeys[keys[0]];
      }

      ck = nextCk;
      this.state.iteration += 1;
    }

    this.state.chainKeyB64 = encodeBytes(ck);
  }
}
