import assert from "node:assert/strict";
import fs from "node:fs";

const fixtureUrl = new URL("./fixtures/protocol-parity.json", import.meta.url);
const fixture = JSON.parse(fs.readFileSync(fixtureUrl, "utf8"));

function assertObject(value, label) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
}

function assertKeys(value, expectedKeys, label) {
  assertObject(value, label);
  assert.deepEqual(Object.keys(value).sort(), [...expectedKeys].sort(), `${label} keys changed`);
}

function assertString(value, label) {
  assert.equal(typeof value, "string", `${label} must be a string`);
}

function assertBoolean(value, label) {
  assert.equal(typeof value, "boolean", `${label} must be a boolean`);
}

function assertNumber(value, label) {
  assert.equal(typeof value, "number", `${label} must be a number`);
}

function assertIsoString(value, label) {
  assertString(value, label);
  assert.ok(!Number.isNaN(Date.parse(value)), `${label} must be ISO-8601`);
}

assertKeys(
  fixture.authStartRequest,
  ["email", "inviteToken", "groupId", "groupInviteToken", "deviceLabel", "ageConfirmed18"],
  "authStartRequest",
);
assertString(fixture.authStartRequest.email, "authStartRequest.email");
assertString(fixture.authStartRequest.inviteToken, "authStartRequest.inviteToken");
assertString(fixture.authStartRequest.groupId, "authStartRequest.groupId");
assertString(fixture.authStartRequest.groupInviteToken, "authStartRequest.groupInviteToken");
assertString(fixture.authStartRequest.deviceLabel, "authStartRequest.deviceLabel");
assert.equal(fixture.authStartRequest.ageConfirmed18, true, "authStartRequest.ageConfirmed18 must stay true");

assertKeys(
  fixture.authSession,
  [
    "accountId",
    "deviceId",
    "sessionId",
    "accessToken",
    "refreshToken",
    "expiresAt",
    "passkeyEnrollmentSuggested",
    "bootstrapConversationId",
    "bootstrapConversationTitle",
  ],
  "authSession",
);
assertString(fixture.authSession.accountId, "authSession.accountId");
assertString(fixture.authSession.deviceId, "authSession.deviceId");
assertString(fixture.authSession.sessionId, "authSession.sessionId");
assertString(fixture.authSession.accessToken, "authSession.accessToken");
assertString(fixture.authSession.refreshToken, "authSession.refreshToken");
assertIsoString(fixture.authSession.expiresAt, "authSession.expiresAt");
assertBoolean(fixture.authSession.passkeyEnrollmentSuggested, "authSession.passkeyEnrollmentSuggested");
assertString(fixture.authSession.bootstrapConversationId, "authSession.bootstrapConversationId");
assertString(fixture.authSession.bootstrapConversationTitle, "authSession.bootstrapConversationTitle");

assertKeys(
  fixture.attachmentTicket,
  [
    "attachmentId",
    "uploadUrl",
    "downloadUrl",
    "expiresAt",
    "maxBytes",
    "encryptionMode",
    "contentClass",
    "retentionMode",
    "protectionProfile",
    "previewBlurHash",
  ],
  "attachmentTicket",
);
assertString(fixture.attachmentTicket.attachmentId, "attachmentTicket.attachmentId");
assertString(fixture.attachmentTicket.uploadUrl, "attachmentTicket.uploadUrl");
assertString(fixture.attachmentTicket.downloadUrl, "attachmentTicket.downloadUrl");
assertIsoString(fixture.attachmentTicket.expiresAt, "attachmentTicket.expiresAt");
assertNumber(fixture.attachmentTicket.maxBytes, "attachmentTicket.maxBytes");

assertKeys(fixture.mailboxAck, ["envelopeIds"], "mailboxAck");
assert.ok(Array.isArray(fixture.mailboxAck.envelopeIds), "mailboxAck.envelopeIds must be an array");

assertKeys(fixture.envelopeBatch, ["cursor", "envelopes", "stats"], "envelopeBatch");
assertKeys(fixture.envelopeBatch.cursor, ["lastSeenEnvelopeId"], "envelopeBatch.cursor");
assertString(fixture.envelopeBatch.cursor.lastSeenEnvelopeId, "envelopeBatch.cursor.lastSeenEnvelopeId");
assert.ok(Array.isArray(fixture.envelopeBatch.envelopes), "envelopeBatch.envelopes must be an array");
assert.equal(fixture.envelopeBatch.envelopes.length, 1, "envelopeBatch should keep a representative envelope");
assertKeys(
  fixture.envelopeBatch.envelopes[0],
  [
    "envelopeId",
    "conversationId",
    "epoch",
    "senderAccountId",
    "senderDeviceId",
    "recipientDeviceId",
    "ciphertext",
    "attachmentIds",
    "clientMessageId",
    "createdAt",
    "expiresAt",
  ],
  "envelopeBatch.envelopes[0]",
);
assertKeys(fixture.envelopeBatch.stats, ["enqueued", "acknowledged", "expired", "rejected", "queued"], "envelopeBatch.stats");

assertKeys(
  fixture.conversationSummary,
  [
    "id",
    "kind",
    "title",
    "epoch",
    "historyMode",
    "parentConversationId",
    "memberAccountIds",
    "memberCount",
    "roomCount",
    "memberCap",
    "sensitiveMediaDefault",
    "joinRuleText",
    "allowMemberInvites",
    "inviteFreezeEnabled",
    "roomAccessPolicy",
    "createdAt",
    "updatedAt",
    "lastMessageAt",
    "lastMessageKind",
    "capabilities",
  ],
  "conversationSummary",
);
assert.ok(Array.isArray(fixture.conversationSummary.memberAccountIds), "conversationSummary.memberAccountIds must be an array");
assertKeys(
  fixture.conversationSummary.capabilities,
  [
    "relayHostedMessages",
    "mailboxTransport",
    "encryptedAttachments",
    "canCreateInvites",
    "canManageMembers",
    "canManagePolicies",
    "canManageRooms",
    "canGrantRoomAccess",
  ],
  "conversationSummary.capabilities",
);

assertKeys(fixture.conversationDetail, [...Object.keys(fixture.conversationSummary), "members", "rooms"], "conversationDetail");
assert.ok(Array.isArray(fixture.conversationDetail.members), "conversationDetail.members must be an array");
assert.ok(Array.isArray(fixture.conversationDetail.rooms), "conversationDetail.rooms must be an array");

assertKeys(
  fixture.deviceLinkStatus,
  [
    "linkId",
    "relayOrigin",
    "qrMode",
    "state",
    "requesterLabel",
    "expiresAt",
    "createdAt",
    "claimedAt",
    "approvedAt",
    "approvedByDeviceId",
    "consumedAt",
    "completedDeviceId",
    "completedSessionId",
    "canComplete",
  ],
  "deviceLinkStatus",
);
assertIsoString(fixture.deviceLinkStatus.expiresAt, "deviceLinkStatus.expiresAt");
assertBoolean(fixture.deviceLinkStatus.canComplete, "deviceLinkStatus.canComplete");

assertKeys(
  fixture.groupInviteRecord,
  [
    "id",
    "conversationId",
    "createdAt",
    "expiresAt",
    "maxUses",
    "useCount",
    "note",
    "inviterDisplayName",
    "status",
    "createdByCurrentAccount",
  ],
  "groupInviteRecord",
);

assertKeys(
  fixture.groupMembershipSummary,
  [
    "id",
    "title",
    "epoch",
    "historyMode",
    "memberCount",
    "memberCap",
    "myRole",
    "sensitiveMediaDefault",
    "joinRuleText",
    "allowMemberInvites",
    "inviteFreezeEnabled",
    "canCreateInvites",
    "canManageMembers",
    "createdAt",
    "updatedAt",
  ],
  "groupMembershipSummary",
);

assertKeys(
  fixture.groupThreadMessage,
  [
    "id",
    "conversationId",
    "historyMode",
    "senderAccountId",
    "senderDisplayName",
    "kind",
    "text",
    "attachment",
    "createdAt",
    "editedAt",
    "readByCount",
  ],
  "groupThreadMessage",
);
assertKeys(
  fixture.groupThreadMessage.attachment,
  [
    "id",
    "downloadUrl",
    "fileName",
    "mimeType",
    "byteLength",
    "contentClass",
    "retentionMode",
    "protectionProfile",
    "previewBlurHash",
    "encryptionMode",
    "fileKeyB64",
    "fileIvB64",
  ],
  "groupThreadMessage.attachment",
);

assertKeys(fixture.meProfile, ["id", "username", "displayName", "email", "bio", "avatarUrl"], "meProfile");
assertKeys(
  fixture.privacySettings,
  ["notificationPreviewMode", "autoDownloadSensitiveMedia", "allowSensitiveExport", "secureAppSwitcher", "oledDark"],
  "privacySettings",
);
assertKeys(
  fixture.sessionDescriptor,
  [
    "id",
    "deviceLabel",
    "createdAt",
    "lastSeenAt",
    "isCurrent",
    "clientPlatform",
    "clientVersion",
    "clientBuild",
    "deviceModel",
  ],
  "sessionDescriptor",
);
assertKeys(
  fixture.reportDisclosure,
  [
    "targetConversationId",
    "targetAccountId",
    "targetAttachmentId",
    "reason",
    "evidenceMessageIds",
    "disclosedPayload",
  ],
  "reportDisclosure",
);
assertObject(fixture.reportDisclosure.disclosedPayload, "reportDisclosure.disclosedPayload");

// communitySummary — same ConversationSummary shape, kind:"community"
assertKeys(fixture.communitySummary, Object.keys(fixture.conversationSummary), "communitySummary");
assert.equal(fixture.communitySummary.kind, "community", "communitySummary.kind must be 'community'");
assert.ok(Array.isArray(fixture.communitySummary.memberAccountIds), "communitySummary.memberAccountIds must be an array");

// communityDetail
assertKeys(
  fixture.communityDetail,
  [...Object.keys(fixture.communitySummary), "members", "rooms"],
  "communityDetail",
);
assert.equal(fixture.communityDetail.kind, "community", "communityDetail.kind must be 'community'");
assert.ok(Array.isArray(fixture.communityDetail.members), "communityDetail.members must be an array");
assert.ok(Array.isArray(fixture.communityDetail.rooms), "communityDetail.rooms must be an array");
assert.ok(fixture.communityDetail.rooms.length > 0, "communityDetail must have at least one room");
assert.equal(fixture.communityDetail.rooms[0].kind, "room", "communityDetail.rooms[0].kind must be 'room'");

// conversationInviteDescriptor
assertKeys(
  fixture.conversationInviteDescriptor,
  [
    "id",
    "conversationId",
    "conversationKind",
    "scope",
    "targetRoomConversationId",
    "targetRoomTitle",
    "inviteToken",
    "inviteUrl",
    "inviterDisplayName",
    "expiresAt",
    "maxUses",
    "useCount",
    "note",
    "status",
    "createdAt",
  ],
  "conversationInviteDescriptor",
);
assertString(fixture.conversationInviteDescriptor.inviteToken, "conversationInviteDescriptor.inviteToken");
assertString(fixture.conversationInviteDescriptor.scope, "conversationInviteDescriptor.scope");
assertIsoString(fixture.conversationInviteDescriptor.createdAt, "conversationInviteDescriptor.createdAt");

// conversationInvitePreview
assertKeys(fixture.conversationInvitePreview, ["invite", "conversation", "room"], "conversationInvitePreview");
assertKeys(
  fixture.conversationInvitePreview.invite,
  [
    "id",
    "status",
    "scope",
    "inviterDisplayName",
    "expiresAt",
    "maxUses",
    "useCount",
    "note",
    "targetRoomConversationId",
    "targetRoomTitle",
  ],
  "conversationInvitePreview.invite",
);
assertKeys(
  fixture.conversationInvitePreview.conversation,
  [
    "id",
    "kind",
    "title",
    "memberCount",
    "memberCap",
    "joinRuleText",
    "sensitiveMediaDefault",
    "allowMemberInvites",
    "inviteFreezeEnabled",
  ],
  "conversationInvitePreview.conversation",
);
assertObject(fixture.conversationInvitePreview.room, "conversationInvitePreview.room");
assertKeys(
  fixture.conversationInvitePreview.room,
  ["id", "title", "memberCount", "roomAccessPolicy"],
  "conversationInvitePreview.room",
);

// conversationSearchResult
assertKeys(
  fixture.conversationSearchResult,
  ["query", "scopedCommunityId", "conversations", "accounts"],
  "conversationSearchResult",
);
assertString(fixture.conversationSearchResult.query, "conversationSearchResult.query");
assert.ok(
  Array.isArray(fixture.conversationSearchResult.conversations),
  "conversationSearchResult.conversations must be an array",
);
assert.ok(
  Array.isArray(fixture.conversationSearchResult.accounts),
  "conversationSearchResult.accounts must be an array",
);
assertKeys(
  fixture.conversationSearchResult.accounts[0],
  ["accountId", "username", "displayName", "sharedConversationId"],
  "conversationSearchResult.accounts[0]",
);
