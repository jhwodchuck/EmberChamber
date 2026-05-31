import {
  encodeDeviceLinkQrPayload,
  parseDeviceLinkQrPayload,
  relayOriginsMatch,
  type DeviceKeyBundle,
  type DeviceLinkConfirmResponse,
  type DeviceLinkStartResponse,
} from "@emberchamber/protocol";
import { requireAuth, parseClientMetadata } from "../middleware/auth";
import {
  deviceRegisterSchema,
  devicePushTokenSchema,
  deviceLinkStartSchema,
  deviceLinkScanSchema,
  deviceLinkClaimSchema,
  deviceLinkStatusQuerySchema,
  deviceLinkConfirmSchema,
  deviceLinkCompleteSchema,
} from "../schemas";
import { blindIndex, encryptString } from "../lib/crypto";
import { dbAll, dbFirst, dbRun } from "../lib/d1";
import { HttpError, json, readJson } from "../lib/http";
import { requirePushTokenSecret } from "../services/push";
import {
  buildDeviceLinkStatus,
  findDeviceLinkByToken,
  hashDeviceLinkToken,
  relayPublicOrigin,
} from "../services/device-link";
import { scheduleCleanup } from "../services/cleanup";
import { createSession } from "../services/session";
import type { DeviceLinkRow, Env } from "../types";

export async function handle(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response | null> {
  const pathname = url.pathname;

  if (request.method === "POST" && pathname === "/v1/devices/register") {
    const auth = await requireAuth(request, env);
    const body = deviceRegisterSchema.parse(await readJson(request));

    await dbRun(
      env.DB,
      `UPDATE devices
          SET public_identity_key = ?1,
              signed_prekey = ?2,
              signed_prekey_signature = ?3,
              one_time_prekeys_json = ?4,
              verified_at = COALESCE(verified_at, ?5)
        WHERE id = ?6 AND account_id = ?7`,
      body.identityKeyB64,
      body.signedPrekeyB64,
      body.signedPrekeySignatureB64,
      JSON.stringify(body.oneTimePrekeysB64),
      new Date().toISOString(),
      auth.deviceId,
      auth.accountId,
    );

    return json({ registered: true, deviceId: auth.deviceId });
  }

  if (request.method === "POST" && pathname === "/v1/devices/push-token") {
    const auth = await requireAuth(request, env);
    const body = devicePushTokenSchema.parse(await readJson(request));
    if (
      (body.platform === "android" && body.provider !== "fcm") ||
      (body.platform === "ios" && body.provider !== "apns")
    ) {
      throw new HttpError(
        400,
        "Push provider does not match the target platform",
        "INVALID_PUSH_PROVIDER",
      );
    }
    const pushSecret = requirePushTokenSecret(env);
    const now = new Date().toISOString();
    const tokenBlindIndex = await blindIndex(
      pushSecret,
      `push:${body.provider}:${body.platform}:${body.token}`,
    );
    const tokenCiphertext = await encryptString(pushSecret, body.token);

    await dbRun(
      env.DB,
      "DELETE FROM device_push_tokens WHERE device_id = ?1 OR token_blind_index = ?2",
      auth.deviceId,
      tokenBlindIndex,
    );
    await dbRun(
      env.DB,
      `INSERT INTO device_push_tokens (
         device_id,
         account_id,
         provider,
         platform,
         push_environment,
         app_id,
         token_ciphertext,
         token_blind_index,
         created_at,
         updated_at,
         last_registered_at,
         invalidated_at
       )
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9, ?9, NULL)`,
      auth.deviceId,
      auth.accountId,
      body.provider,
      body.platform,
      body.pushEnvironment ?? null,
      body.appId ?? null,
      tokenCiphertext,
      tokenBlindIndex,
      now,
    );

    return json({
      registered: true,
      deviceId: auth.deviceId,
      provider: body.provider,
      platform: body.platform,
    });
  }

  if (
    request.method === "DELETE" &&
    pathname === "/v1/devices/push-token"
  ) {
    const auth = await requireAuth(request, env);
    await dbRun(
      env.DB,
      "DELETE FROM device_push_tokens WHERE device_id = ?1 AND account_id = ?2",
      auth.deviceId,
      auth.accountId,
    );

    return json({ cleared: true, deviceId: auth.deviceId });
  }

  if (request.method === "POST" && pathname === "/v1/devices/link/start") {
    const auth = await requireAuth(request, env);
    const body = deviceLinkStartSchema.parse(await readJson(request));
    const now = new Date().toISOString();
    const linkId = crypto.randomUUID();
    const linkToken = `${linkId}.${crypto.randomUUID()}`;
    const tokenHash = await hashDeviceLinkToken(linkToken);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const qrPayload = encodeDeviceLinkQrPayload({
      relayOrigin: relayPublicOrigin(env),
      qrMode: "source_display",
      linkToken,
      requesterLabel: body.deviceLabel,
    });

    await dbRun(
      env.DB,
      `INSERT INTO device_links (id, account_id, requester_label, link_token_hash, qr_mode, created_at, expires_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      linkId,
      auth.accountId,
      body.deviceLabel,
      tokenHash,
      "source_display",
      now,
      expiresAt,
    );
    await scheduleCleanup(env, "device_link_start");

    const createdRow: DeviceLinkRow = {
      id: linkId,
      account_id: auth.accountId,
      requester_label: body.deviceLabel,
      qr_mode: "source_display",
      created_at: now,
      expires_at: expiresAt,
      claimed_at: null,
      approved_at: null,
      approved_by_device_id: null,
      consumed_at: null,
      completed_device_id: null,
      completed_session_id: null,
    };

    return json({
      ...buildDeviceLinkStatus(env, createdRow),
      linkId,
      qrPayload,
    } satisfies DeviceLinkStartResponse);
  }

  if (request.method === "POST" && pathname === "/v1/devices/link/scan") {
    const auth = await requireAuth(request, env);
    const body = deviceLinkScanSchema.parse(await readJson(request));
    const parsed = parseDeviceLinkQrPayload(body.qrPayload);
    if (parsed.qrMode !== "target_display") {
      throw new HttpError(
        400,
        "That QR is meant for a new device, not a signed-in device.",
        "DEVICE_LINK_QR_MODE_INVALID",
      );
    }
    if (!relayOriginsMatch(relayPublicOrigin(env), parsed.relayOrigin)) {
      throw new HttpError(
        400,
        "That QR belongs to a different relay environment.",
        "DEVICE_LINK_RELAY_MISMATCH",
      );
    }

    const requesterLabel = parsed.requesterLabel?.trim() || "New device";
    const now = new Date().toISOString();
    const existing = await findDeviceLinkByToken(env, parsed.linkToken);
    if (existing) {
      if (existing.account_id !== auth.accountId) {
        throw new HttpError(
          403,
          "This QR is already attached to a different account.",
          "FORBIDDEN",
        );
      }
      if (existing.qr_mode !== "target_display") {
        throw new HttpError(
          409,
          "This device-link QR is for the opposite flow.",
          "DEVICE_LINK_QR_MODE_INVALID",
        );
      }
      if (
        !existing.claimed_at ||
        existing.requester_label !== requesterLabel
      ) {
        await dbRun(
          env.DB,
          `UPDATE device_links
              SET requester_label = ?1,
                  claimed_at = COALESCE(claimed_at, ?2)
            WHERE id = ?3`,
          requesterLabel,
          now,
          existing.id,
        );
      }

      return json(
        buildDeviceLinkStatus(env, {
          ...existing,
          requester_label: requesterLabel,
          claimed_at: existing.claimed_at ?? now,
        }),
      );
    }

    const linkId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await dbRun(
      env.DB,
      `INSERT INTO device_links (
         id,
         account_id,
         requester_label,
         link_token_hash,
         qr_mode,
         created_at,
         expires_at,
         claimed_at
       )
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?6)`,
      linkId,
      auth.accountId,
      requesterLabel,
      await hashDeviceLinkToken(parsed.linkToken),
      "target_display",
      now,
      expiresAt,
    );
    await scheduleCleanup(env, "device_link_scan");

    return json(
      buildDeviceLinkStatus(env, {
        id: linkId,
        account_id: auth.accountId,
        requester_label: requesterLabel,
        qr_mode: "target_display",
        created_at: now,
        expires_at: expiresAt,
        claimed_at: now,
        approved_at: null,
        approved_by_device_id: null,
        consumed_at: null,
        completed_device_id: null,
        completed_session_id: null,
      }),
    );
  }

  if (request.method === "POST" && pathname === "/v1/devices/link/claim") {
    const body = deviceLinkClaimSchema.parse(await readJson(request));
    const parsed = parseDeviceLinkQrPayload(body.qrPayload);
    if (parsed.qrMode !== "source_display") {
      throw new HttpError(
        400,
        "That QR is meant to be scanned by a signed-in device.",
        "DEVICE_LINK_QR_MODE_INVALID",
      );
    }
    if (!relayOriginsMatch(relayPublicOrigin(env), parsed.relayOrigin)) {
      throw new HttpError(
        400,
        "That QR belongs to a different relay environment.",
        "DEVICE_LINK_RELAY_MISMATCH",
      );
    }

    const row = await findDeviceLinkByToken(env, parsed.linkToken);
    if (!row) {
      throw new HttpError(
        404,
        "Device-link request not found",
        "DEVICE_LINK_NOT_FOUND",
      );
    }
    if (row.qr_mode !== "source_display") {
      throw new HttpError(
        409,
        "This device-link QR is for the opposite flow.",
        "DEVICE_LINK_QR_MODE_INVALID",
      );
    }

    const now = new Date().toISOString();
    const status = buildDeviceLinkStatus(env, row);
    if (
      status.state === "approved" ||
      status.state === "consumed" ||
      status.state === "expired"
    ) {
      return json(status);
    }

    const normalizedDeviceLabel = body.deviceLabel.trim();
    if (row.claimed_at && row.requester_label !== normalizedDeviceLabel) {
      throw new HttpError(
        409,
        "This device-link request was already claimed by another device.",
        "DEVICE_LINK_ALREADY_CLAIMED",
      );
    }

    await dbRun(
      env.DB,
      `UPDATE device_links
          SET requester_label = ?1,
              claimed_at = COALESCE(claimed_at, ?2)
        WHERE id = ?3`,
      normalizedDeviceLabel,
      now,
      row.id,
    );

    return json(
      buildDeviceLinkStatus(env, {
        ...row,
        requester_label: normalizedDeviceLabel,
        claimed_at: row.claimed_at ?? now,
      }),
    );
  }

  if (request.method === "GET" && pathname === "/v1/devices/link/status") {
    const query = deviceLinkStatusQuerySchema.parse({
      token: url.searchParams.get("token") ?? undefined,
      qrMode: url.searchParams.get("qrMode") ?? undefined,
    });
    const row = await findDeviceLinkByToken(env, query.token);
    if (!row) {
      throw new HttpError(
        404,
        "Device-link request not found",
        "DEVICE_LINK_NOT_FOUND",
      );
    }
    if (row.qr_mode !== query.qrMode) {
      throw new HttpError(
        409,
        "This device-link QR is for the opposite flow.",
        "DEVICE_LINK_QR_MODE_INVALID",
      );
    }

    return json(buildDeviceLinkStatus(env, row));
  }

  if (
    request.method === "POST" &&
    pathname === "/v1/devices/link/confirm"
  ) {
    const auth = await requireAuth(request, env);
    const body = deviceLinkConfirmSchema.parse(await readJson(request));
    const row = await dbFirst<DeviceLinkRow>(
      env.DB,
      `SELECT
         id,
         account_id,
         requester_label,
         qr_mode,
         created_at,
         expires_at,
         claimed_at,
         approved_at,
         approved_by_device_id,
         consumed_at,
         completed_device_id,
         completed_session_id
       FROM device_links
      WHERE id = ?1
        AND account_id = ?2`,
      body.linkId,
      auth.accountId,
    );
    if (!row) {
      throw new HttpError(
        404,
        "Device-link request not found",
        "DEVICE_LINK_NOT_FOUND",
      );
    }

    const currentStatus = buildDeviceLinkStatus(env, row);
    if (
      currentStatus.state !== "pending_approval" &&
      currentStatus.state !== "approved"
    ) {
      return json({
        ...currentStatus,
        linkId: row.id,
        confirmed: true,
      } satisfies DeviceLinkConfirmResponse);
    }

    const approvedAt = row.approved_at ?? new Date().toISOString();
    if (!row.approved_at) {
      await dbRun(
        env.DB,
        `UPDATE device_links
            SET approved_at = ?1, approved_by_device_id = ?2
          WHERE id = ?3 AND account_id = ?4`,
        approvedAt,
        auth.deviceId,
        body.linkId,
        auth.accountId,
      );
    }

    return json({
      ...buildDeviceLinkStatus(env, {
        ...row,
        approved_at: approvedAt,
        approved_by_device_id: row.approved_by_device_id ?? auth.deviceId,
      }),
      linkId: row.id,
      confirmed: true,
    } satisfies DeviceLinkConfirmResponse);
  }

  if (
    request.method === "POST" &&
    pathname === "/v1/devices/link/complete"
  ) {
    const body = deviceLinkCompleteSchema.parse(await readJson(request));
    const clientMetadata = parseClientMetadata(request);
    const row = await findDeviceLinkByToken(env, body.linkToken);
    if (!row) {
      throw new HttpError(
        404,
        "Device-link request not found",
        "DEVICE_LINK_NOT_FOUND",
      );
    }
    if (row.qr_mode !== body.qrMode) {
      throw new HttpError(
        409,
        "This device-link QR is for the opposite flow.",
        "DEVICE_LINK_QR_MODE_INVALID",
      );
    }

    const status = buildDeviceLinkStatus(env, row);
    if (status.state === "expired") {
      throw new HttpError(
        410,
        "This device-link request expired. Start a fresh QR.",
        "DEVICE_LINK_EXPIRED",
      );
    }
    if (status.state === "consumed") {
      throw new HttpError(
        409,
        "This device-link request was already used.",
        "DEVICE_LINK_CONSUMED",
      );
    }
    if (status.state !== "approved") {
      throw new HttpError(
        409,
        "This device-link request is not approved yet.",
        "DEVICE_LINK_NOT_APPROVED",
      );
    }

    const now = new Date().toISOString();
    const deviceId = crypto.randomUUID();
    await dbRun(
      env.DB,
      `INSERT INTO devices (id, account_id, device_label, linked_from_device_id, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5)`,
      deviceId,
      row.account_id,
      row.requester_label,
      row.approved_by_device_id,
      now,
    );

    const session = await createSession(
      env,
      row.account_id,
      deviceId,
      null,
      clientMetadata,
    );
    await dbRun(
      env.DB,
      `UPDATE device_links
          SET consumed_at = ?1,
              completed_device_id = ?2,
              completed_session_id = ?3
        WHERE id = ?4`,
      now,
      deviceId,
      session.sessionId,
      row.id,
    );

    return json(session);
  }

  const accountDeviceBundlesMatch = pathname.match(
    /^\/v1\/accounts\/([0-9a-f-]{36})\/device-bundles$/i,
  );
  if (request.method === "GET" && accountDeviceBundlesMatch) {
    const auth = await requireAuth(request, env);
    const targetAccountId = accountDeviceBundlesMatch[1];

    if (targetAccountId !== auth.accountId) {
      const sharedConversation = await dbFirst<{ conversation_id: string }>(
        env.DB,
        `SELECT me.conversation_id
           FROM conversation_members me
           JOIN conversation_members peer
             ON peer.conversation_id = me.conversation_id
            AND peer.account_id = ?2
            AND peer.removed_at IS NULL
          WHERE me.account_id = ?1
            AND me.removed_at IS NULL
          LIMIT 1`,
        auth.accountId,
        targetAccountId,
      );

      if (!sharedConversation) {
        throw new HttpError(
          403,
          "No shared conversation with this account",
          "FORBIDDEN",
        );
      }
    }

    const rows = await dbAll<{
      id: string;
      device_label: string;
      public_identity_key: string;
      signed_prekey: string;
      signed_prekey_signature: string;
      one_time_prekeys_json: string | null;
      uploaded_at: string;
    }>(
      env.DB,
      `SELECT
         id,
         device_label,
         public_identity_key,
         signed_prekey,
         signed_prekey_signature,
         one_time_prekeys_json,
         COALESCE(verified_at, created_at) AS uploaded_at
       FROM devices
      WHERE account_id = ?1
        AND revoked_at IS NULL
        AND public_identity_key IS NOT NULL
        AND signed_prekey IS NOT NULL
        AND signed_prekey_signature IS NOT NULL
      ORDER BY created_at ASC`,
      targetAccountId,
    );

    const bundles: DeviceKeyBundle[] = rows.map((row) => ({
      accountId: targetAccountId,
      deviceId: row.id,
      deviceLabel: row.device_label,
      uploadedAt: row.uploaded_at,
      bundle: {
        identityKeyB64: row.public_identity_key,
        signedPrekeyB64: row.signed_prekey,
        signedPrekeySignatureB64: row.signed_prekey_signature,
        oneTimePrekeysB64: row.one_time_prekeys_json
          ? (JSON.parse(row.one_time_prekeys_json) as string[])
          : [],
      },
    }));

    return json(bundles);
  }

  return null;
}
