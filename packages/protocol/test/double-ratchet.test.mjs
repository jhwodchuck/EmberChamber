import assert from "node:assert/strict";
import nacl from "tweetnacl";
import {
  hkdfSha256,
  computeX3dhAlice,
  computeX3dhBob,
  DoubleRatchetSession,
  SenderKeySession,
  encodeBytes,
  decodeBytes,
} from "../dist/index.js";

// Helper to generate key pair in B64
function generateKeyPairB64() {
  const kp = nacl.box.keyPair();
  return {
    publicB64: encodeBytes(kp.publicKey),
    privateB64: encodeBytes(kp.secretKey),
    kp,
  };
}

console.log("Running Double Ratchet and X3DH tests...");

// Test 1: HKDF SHA256
const ikm = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
const okm = hkdfSha256(ikm, 32);
assert.equal(okm.length, 32, "HKDF output length should be 32 bytes");
console.log("✓ Test 1: HKDF SHA256 passed");

// Test 2: X3DH Key Agreement
const aliceIdentity = generateKeyPairB64();
const aliceEphemeral = generateKeyPairB64();

const bobIdentity = generateKeyPairB64();
const bobSignedPrekey = generateKeyPairB64();
const bobOneTimePrekey = generateKeyPairB64();

// Alice computes master key
const aliceSK = computeX3dhAlice({
  ourIdentityPrivateB64: aliceIdentity.privateB64,
  ourEphemeralPrivateB64: aliceEphemeral.privateB64,
  peerIdentityPublicB64: bobIdentity.publicB64,
  peerSignedPrekeyPublicB64: bobSignedPrekey.publicB64,
  peerOneTimePrekeyPublicB64: bobOneTimePrekey.publicB64,
});

// Bob computes master key
const bobSK = computeX3dhBob({
  ourIdentityPrivateB64: bobIdentity.privateB64,
  ourSignedPrekeyPrivateB64: bobSignedPrekey.privateB64,
  peerIdentityPublicB64: aliceIdentity.publicB64,
  peerEphemeralPublicB64: aliceEphemeral.publicB64,
  ourOneTimePrekeyPrivateB64: bobOneTimePrekey.privateB64,
});

assert.deepEqual(aliceSK, bobSK, "Alice and Bob X3DH shared key should match");
console.log("✓ Test 2: X3DH Key Agreement passed");

// Test 3: Double Ratchet Session Setup & 1-Way Message Flow
const aliceSession = DoubleRatchetSession.initAlice({
  peerDeviceId: "bob-device-1",
  sharedMasterKey: aliceSK,
  peerDhPublicKeyB64: bobSignedPrekey.publicB64,
});

const bobSession = DoubleRatchetSession.initBob({
  peerDeviceId: "alice-device-1",
  sharedMasterKey: bobSK,
  ourSignedPrekeyKeyPair: bobSignedPrekey.kp,
});

// Alice sends to Bob
const message1 = new TextEncoder().encode("Hello Bob, this is a secure Double Ratchet message!");
const encrypted1 = aliceSession.encrypt(message1);

// Bob decrypts from Alice
const decrypted1 = bobSession.decrypt({
  ciphertext: encrypted1.ciphertext,
  dhPubB64: encodeBytes(encrypted1.dhPub),
  n: encrypted1.n,
  pn: encrypted1.pn,
});

assert.deepEqual(decrypted1, message1, "Bob should successfully decrypt Alice's message");
console.log("✓ Test 3: Double Ratchet 1-way message decrypted successfully");

// Test 4: Two-Way Message Flow with Ratcheting
// Bob replies to Alice (Bob's first send triggers his ratchet step because he now has Alice's ratchet public key)
// Since Bob's session currently has ckSend = null, he must first decrypt a message (which he did, setting peerDhPublicKey)
// Now Bob encrypts a message back to Alice
const message2 = new TextEncoder().encode("Hey Alice! Got your message. Double Ratchet is working!");
const encrypted2 = bobSession.encrypt(message2);

const decrypted2 = aliceSession.decrypt({
  ciphertext: encrypted2.ciphertext,
  dhPubB64: encodeBytes(encrypted2.dhPub),
  n: encrypted2.n,
  pn: encrypted2.pn,
});

assert.deepEqual(decrypted2, message2, "Alice should successfully decrypt Bob's reply");
console.log("✓ Test 4: Two-way message decrypted successfully");

// Test 5: Out of Order Decryption
// Alice sends message 3 and message 4
const message3 = new TextEncoder().encode("Message 3");
const message4 = new TextEncoder().encode("Message 4");

const encrypted3 = aliceSession.encrypt(message3);
const encrypted4 = aliceSession.encrypt(message4);

// Bob receives message 4 FIRST (out of order)
const decrypted4 = bobSession.decrypt({
  ciphertext: encrypted4.ciphertext,
  dhPubB64: encodeBytes(encrypted4.dhPub),
  n: encrypted4.n,
  pn: encrypted4.pn,
});
assert.deepEqual(decrypted4, message4, "Bob should decrypt message 4 out-of-order");

// Bob receives message 3 LATER
const decrypted3 = bobSession.decrypt({
  ciphertext: encrypted3.ciphertext,
  dhPubB64: encodeBytes(encrypted3.dhPub),
  n: encrypted3.n,
  pn: encrypted3.pn,
});
assert.deepEqual(decrypted3, message3, "Bob should decrypt message 3 from skipped message keys");

console.log("✓ Test 5: Out of order decryption passed");

// Test 6: Sender Key Session (Group Encryption & Out-of-Order Decryption)
const groupId = "group-123";
const senderDeviceId = "alice-device-1";

// Alice creates her Sender Key session
const aliceGroupSession = SenderKeySession.create(groupId, senderDeviceId);
const distributionMessage = aliceGroupSession.makeDistributionMessage();

// Bob receives distribution message and initializes Bob's view of Alice's sender key
const bobGroupSession = new SenderKeySession({
  groupId: distributionMessage.groupId,
  senderDeviceId: distributionMessage.senderDeviceId,
  iteration: distributionMessage.iteration,
  chainKeyB64: distributionMessage.chainKeyB64,
  signaturePublicKeyB64: distributionMessage.signaturePublicKeyB64,
  skippedMessageKeys: {},
});

// Alice sends messages to the group
const groupMsg1 = new TextEncoder().encode("Hello Group! This is Alice.");
const groupMsg2 = new TextEncoder().encode("Second message from Alice.");

const encryptedGroup1 = aliceGroupSession.encrypt(groupMsg1);
const encryptedGroup2 = aliceGroupSession.encrypt(groupMsg2);

// Bob receives message 2 FIRST (out-of-order)
const decryptedGroup2 = bobGroupSession.decrypt({
  ciphertext: encryptedGroup2.ciphertext,
  iteration: encryptedGroup2.iteration,
  signature: encryptedGroup2.signature,
});
assert.deepEqual(decryptedGroup2, groupMsg2, "Bob should successfully decrypt Alice's second group message out-of-order");

// Bob receives message 1 LATER
const decryptedGroup1 = bobGroupSession.decrypt({
  ciphertext: encryptedGroup1.ciphertext,
  iteration: encryptedGroup1.iteration,
  signature: encryptedGroup1.signature,
});
assert.deepEqual(decryptedGroup1, groupMsg1, "Bob should successfully decrypt Alice's first group message from skipped keys");

console.log("✓ Test 6: Sender Keys group message & out-of-order decryption passed");
console.log("All Double Ratchet & X3DH tests passed successfully!");
