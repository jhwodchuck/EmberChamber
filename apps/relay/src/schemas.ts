import { z } from "zod";

export const authStartSchema = z.object({
  email: z.string().email(),
  inviteToken: z.string().min(3).max(128).optional(),
  groupId: z.string().uuid().optional(),
  groupInviteToken: z.string().min(3).max(256).optional(),
  deviceLabel: z.string().min(1).max(64).default("New device"),
  ageConfirmed18: z.literal(true),
});

export const authCompleteSchema = z.object({
  completionToken: z.string().min(12),
  deviceLabel: z.string().min(1).max(64).optional(),
});

export const deviceRegisterSchema = z.object({
  identityKeyB64: z.string().min(16),
  signedPrekeyB64: z.string().min(16),
  signedPrekeySignatureB64: z.string().min(16),
  oneTimePrekeysB64: z.array(z.string().min(16)).max(100).default([]),
});

export const devicePushTokenSchema = z.object({
  provider: z.enum(["fcm", "apns"]),
  platform: z.enum(["android", "ios"]),
  token: z.string().min(16).max(4096),
  appId: z.string().min(1).max(160).optional(),
  pushEnvironment: z.enum(["production", "sandbox"]).optional(),
});

export const directMessageSchema = z.object({
  peerAccountId: z.string().uuid(),
});

export const groupSchema = z.object({
  title: z.string().min(1).max(80),
  memberAccountIds: z.array(z.string().uuid()).max(11).default([]),
  memberCap: z.number().int().min(2).max(12).default(12),
  sensitiveMediaDefault: z.boolean().default(false),
  joinRuleText: z.string().min(1).max(500).optional(),
  allowMemberInvites: z.boolean().default(false),
});

export const communitySchema = z.object({
  title: z.string().min(1).max(80),
  memberAccountIds: z.array(z.string().uuid()).max(149).default([]),
  memberCap: z.number().int().min(10).max(250).default(150),
  sensitiveMediaDefault: z.boolean().default(false),
  joinRuleText: z.string().min(1).max(500).optional(),
  allowMemberInvites: z.boolean().default(false),
  defaultRoomTitle: z.string().min(1).max(80).default("General"),
});

export const communityPolicySchema = z.object({
  allowMemberInvites: z.boolean().optional(),
  inviteFreezeEnabled: z.boolean().optional(),
});

export const communityRoomSchema = z.object({
  title: z.string().min(1).max(80),
  joinRuleText: z.string().min(1).max(500).optional(),
  sensitiveMediaDefault: z.boolean().default(false),
  roomAccessPolicy: z
    .enum(["all_members", "restricted"])
    .default("all_members"),
  memberAccountIds: z.array(z.string().uuid()).max(149).default([]),
});

export const messageBatchSchema = z.object({
  conversationId: z.string().uuid(),
  epoch: z.number().int().min(1),
  envelopes: z
    .array(
      z.object({
        recipientDeviceId: z.string().uuid(),
        ciphertext: z.string().min(16),
        clientMessageId: z.string().min(8),
        attachmentIds: z.array(z.string()).default([]),
      }),
    )
    .min(1)
    .max(200),
});

export const mailboxAckSchema = z.object({
  envelopeIds: z.array(z.string().min(8)).min(1).max(200),
});

export const attachmentTicketSchema = z
  .object({
    fileName: z.string().min(1).max(160),
    mimeType: z.string().min(1).max(120),
    byteLength: z
      .number()
      .int()
      .positive()
      .max(20 * 1024 * 1024)
      .optional(),
    sha256B64: z.string().optional(),
    encryptionMode: z.enum(["none", "device_encrypted"]).default("none"),
    ciphertextByteLength: z
      .number()
      .int()
      .positive()
      .max(20 * 1024 * 1024)
      .optional(),
    ciphertextSha256B64: z.string().optional(),
    plaintextByteLength: z
      .number()
      .int()
      .positive()
      .max(20 * 1024 * 1024)
      .optional(),
    plaintextSha256B64: z.string().optional(),
    conversationId: z.string().uuid().optional(),
    conversationEpoch: z.number().int().min(1).optional(),
    contentClass: z.enum(["image", "video", "audio", "file"]).default("image"),
    retentionMode: z
      .enum(["private_vault", "ephemeral"])
      .default("private_vault"),
    protectionProfile: z
      .enum(["sensitive_media", "standard"])
      .default("standard"),
    previewBlurHash: z.string().max(120).optional(),
    fileKeyB64: z.string().max(4096).optional(),
    fileIvB64: z.string().max(4096).optional(),
  })
  .superRefine((value, ctx) => {
    const storedByteLength = value.ciphertextByteLength ?? value.byteLength;
    if (!storedByteLength) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Attachment uploads need byteLength or ciphertextByteLength.",
        path: ["byteLength"],
      });
    }

    if (
      value.encryptionMode === "device_encrypted" &&
      !value.plaintextByteLength
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Encrypted attachments need plaintextByteLength.",
        path: ["plaintextByteLength"],
      });
    }
  });

export const reportSchema = z.object({
  targetConversationId: z.string().uuid().optional(),
  targetAccountId: z.string().uuid().optional(),
  targetAttachmentId: z.string().uuid().optional(),
  reason: z.enum([
    "spam",
    "harassment",
    "illegal_content",
    "malware",
    "csam",
    "non_consensual_intimate_media",
    "coercion_or_extortion",
    "impersonation",
    "underage_risk",
    "other",
  ]),
  evidenceMessageIds: z.array(z.string().min(8)).max(25).optional(),
  disclosedPayload: z.record(z.unknown()),
});

export const deviceLinkStartSchema = z.object({
  deviceLabel: z.string().min(1).max(64).default("Current device"),
});

export const deviceLinkScanSchema = z.object({
  qrPayload: z.string().min(16),
});

export const deviceLinkClaimSchema = z.object({
  qrPayload: z.string().min(16),
  deviceLabel: z.string().min(1).max(64),
});

export const deviceLinkStatusQuerySchema = z.object({
  token: z.string().min(16),
  qrMode: z.enum(["source_display", "target_display"]),
});

export const deviceLinkConfirmSchema = z.object({
  linkId: z.string().uuid(),
});

export const deviceLinkCompleteSchema = z.object({
  linkToken: z.string().min(16),
  qrMode: z.enum(["source_display", "target_display"]),
});

export const conversationInviteSchema = z.object({
  maxUses: z.number().int().min(1).max(100).optional(),
  expiresInHours: z
    .number()
    .int()
    .min(1)
    .max(24 * 14)
    .optional(),
  note: z.string().min(1).max(240).optional(),
  scope: z.enum(["conversation", "room"]).default("conversation"),
  roomId: z.string().uuid().optional(),
});

export const groupThreadMessageSchema = z.object({
  text: z.string().max(2000).optional(),
  attachmentId: z.string().uuid().optional(),
  clientMessageId: z.string().min(8).max(120).optional(),
  replyToMessageId: z.string().uuid().optional(),
});

export const reactionMutationSchema = z.object({
  emoji: z.string().min(1).max(16),
});

export const profileSchema = z.object({
  displayName: z.string().min(1).max(128).optional(),
  bio: z.string().max(512).optional(),
  avatarAttachmentId: z.string().uuid().optional().nullable(),
});

export const privacySettingsSchema = z.object({
  notificationPreviewMode: z
    .enum(["discreet", "expanded", "none"])
    .default("discreet"),
  autoDownloadSensitiveMedia: z.boolean().default(false),
  allowSensitiveExport: z.boolean().default(false),
  secureAppSwitcher: z.boolean().default(true),
});

export const adminRevokeSessionsSchema = z.object({
  accountId: z.string().uuid(),
  reason: z.string().trim().max(240).optional(),
  revokePushTokens: z.boolean().default(true),
});

export const contactCardSchema = z.object({
  cardToken: z.string().min(8),
});
