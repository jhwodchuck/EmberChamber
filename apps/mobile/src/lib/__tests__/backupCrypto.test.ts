import {
  decryptBackupBundle,
  encryptBackupBundle,
  scorePassphrase,
} from "../backupCrypto";

describe("backupCrypto", () => {
  it("round-trips plaintext through encrypt/decrypt with the same passphrase", () => {
    const plaintext = JSON.stringify({ hello: "world", n: 42 });
    const passphrase = "correct horse battery staple";

    const envelope = encryptBackupBundle(plaintext, passphrase);
    expect(envelope.v).toBe(1);
    expect(envelope.ciphertext).not.toContain("hello");

    const decrypted = decryptBackupBundle(envelope, passphrase);
    expect(decrypted).toBe(plaintext);
  });

  it("produces a unique salt and nonce per encryption", () => {
    const a = encryptBackupBundle("same", "passphrase-one-two-three");
    const b = encryptBackupBundle("same", "passphrase-one-two-three");
    expect(a.salt).not.toBe(b.salt);
    expect(a.nonce).not.toBe(b.nonce);
  });

  it("fails to decrypt with the wrong passphrase", () => {
    const envelope = encryptBackupBundle("secret", "the-right-passphrase");
    expect(() => decryptBackupBundle(envelope, "the-wrong-passphrase")).toThrow(
      /wrong passphrase or corrupted/i,
    );
  });

  it("rejects an unsupported envelope version", () => {
    const envelope = encryptBackupBundle("secret", "passphrase-abcdefgh");
    expect(() =>
      decryptBackupBundle({ ...envelope, v: 999 }, "passphrase-abcdefgh"),
    ).toThrow(/unsupported backup version/i);
  });

  it("scores passphrase strength by length and variety", () => {
    expect(scorePassphrase("short").score).toBe(0);
    expect(scorePassphrase("elevenchars").score).toBe(1);
    expect(scorePassphrase("twelvecharlong").score).toBe(2);
    expect(scorePassphrase("Sixteenchars12!!").score).toBe(3);
  });
});
