import {
  type MeProfile,
  type SessionDescriptor,
} from "@emberchamber/protocol";
import { requireAuth } from "../middleware/auth";
import { profileSchema, privacySettingsSchema } from "../schemas";
import { decryptString } from "../lib/crypto";
import { dbAll, dbFirst, dbRun } from "../lib/d1";
import { HttpError, json, readJson } from "../lib/http";
import { signAttachmentToken } from "../services/attachments";
import { accountUsername, conversationTitleForAccount } from "../services/utils";
import type { Env } from "../types";

export async function handle(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response | null> {
  const pathname = url.pathname;

  if (request.method === "GET" && pathname === "/v1/me") {
    const auth = await requireAuth(request, env);
    const account = await dbFirst<{
      display_name: string;
      bio: string | null;
      email_ciphertext: string;
      avatar_attachment_id: string | null;
    }>(
      env.DB,
      `SELECT a.display_name, a.bio, ae.email_ciphertext, a.avatar_attachment_id
         FROM accounts a
         JOIN account_emails ae ON ae.account_id = a.id
        WHERE a.id = ?1`,
      auth.accountId,
    );

    if (!account) {
      throw new HttpError(404, "Account not found", "ACCOUNT_NOT_FOUND");
    }

    let avatarUrl: string | undefined;
    if (account.avatar_attachment_id) {
      const expiresAtMs = Date.now() + 60 * 60 * 1000; // 1 hour for avatar
      const token = await signAttachmentToken(
        env,
        account.avatar_attachment_id,
        "download",
        expiresAtMs,
      );
      avatarUrl = `${env.EMBERCHAMBER_RELAY_PUBLIC_URL}/v1/attachments/download/${account.avatar_attachment_id}?token=${encodeURIComponent(token)}`;
    }

    const profile: MeProfile = {
      id: auth.accountId,
      username: accountUsername(auth.accountId),
      displayName: account.display_name,
      email: await decryptString(
        env.EMBERCHAMBER_EMAIL_ENCRYPTION_SECRET,
        account.email_ciphertext,
      ),
      bio: account.bio ?? undefined,
      avatarUrl,
    };

    return json(profile);
  }

  if (request.method === "PATCH" && pathname === "/v1/me") {
    const auth = await requireAuth(request, env);
    const body = profileSchema.parse(await readJson(request));
    const existing = await dbFirst<{
      display_name: string;
      bio: string | null;
      avatar_attachment_id: string | null;
    }>(
      env.DB,
      "SELECT display_name, bio, avatar_attachment_id FROM accounts WHERE id = ?1",
      auth.accountId,
    );

    if (!existing) {
      throw new HttpError(404, "Account not found", "ACCOUNT_NOT_FOUND");
    }

    const displayName = body.displayName ?? existing.display_name;
    const bio = body.bio ?? existing.bio;
    // null explicitly clears the avatar; undefined means no change
    const avatarAttachmentId =
      body.avatarAttachmentId !== undefined
        ? body.avatarAttachmentId
        : existing.avatar_attachment_id;
    await dbRun(
      env.DB,
      "UPDATE accounts SET display_name = ?1, bio = ?2, avatar_attachment_id = ?3, updated_at = ?4 WHERE id = ?5",
      displayName,
      bio ?? null,
      avatarAttachmentId,
      new Date().toISOString(),
      auth.accountId,
    );

    return json({ updated: true, displayName, bio: bio ?? null });
  }

  if (request.method === "GET" && pathname === "/v1/me/privacy") {
    const auth = await requireAuth(request, env);
    const settings = await dbFirst<{
      notification_preview_mode: string | null;
      auto_download_sensitive_media: number | null;
      allow_sensitive_export: number | null;
      secure_app_switcher: number | null;
    }>(
      env.DB,
      `SELECT notification_preview_mode, auto_download_sensitive_media, allow_sensitive_export, secure_app_switcher
         FROM accounts
        WHERE id = ?1`,
      auth.accountId,
    );

    if (!settings) {
      throw new HttpError(404, "Account not found", "ACCOUNT_NOT_FOUND");
    }

    return json({
      notificationPreviewMode:
        settings.notification_preview_mode ?? "discreet",
      autoDownloadSensitiveMedia: Boolean(
        settings.auto_download_sensitive_media ?? 0,
      ),
      allowSensitiveExport: Boolean(settings.allow_sensitive_export ?? 0),
      secureAppSwitcher: Boolean(settings.secure_app_switcher ?? 1),
    });
  }

  if (request.method === "PATCH" && pathname === "/v1/me/privacy") {
    const auth = await requireAuth(request, env);
    const body = privacySettingsSchema.parse(await readJson(request));
    await dbRun(
      env.DB,
      `UPDATE accounts
          SET notification_preview_mode = ?1,
              auto_download_sensitive_media = ?2,
              allow_sensitive_export = ?3,
              secure_app_switcher = ?4,
              updated_at = ?5
        WHERE id = ?6`,
      body.notificationPreviewMode,
      body.autoDownloadSensitiveMedia ? 1 : 0,
      body.allowSensitiveExport ? 1 : 0,
      body.secureAppSwitcher ? 1 : 0,
      new Date().toISOString(),
      auth.accountId,
    );

    return json(body);
  }

  if (request.method === "GET" && pathname === "/v1/sessions") {
    const auth = await requireAuth(request, env);
    const rows = await dbAll<{
      id: string;
      device_label: string;
      created_at: string;
      last_seen_at: string;
      client_platform: string | null;
      client_version: string | null;
      client_build: string | null;
      device_model: string | null;
    }>(
      env.DB,
      `SELECT
         s.id,
         d.device_label,
         s.created_at,
         s.last_seen_at,
         s.client_platform,
         s.client_version,
         s.client_build,
         s.device_model
         FROM sessions s
         JOIN devices d ON d.id = s.device_id
        WHERE s.account_id = ?1
          AND s.revoked_at IS NULL
          AND s.expires_at > ?2
        ORDER BY s.last_seen_at DESC`,
      auth.accountId,
      new Date().toISOString(),
    );

    const sessions: SessionDescriptor[] = rows.map((row) => ({
      id: row.id,
      deviceLabel: row.device_label,
      createdAt: row.created_at,
      lastSeenAt: row.last_seen_at,
      isCurrent: row.id === auth.sessionId,
      clientPlatform: row.client_platform,
      clientVersion: row.client_version,
      clientBuild: row.client_build,
      deviceModel: row.device_model,
    }));

    return json(sessions);
  }

  const sessionDeleteMatch = pathname.match(
    /^\/v1\/sessions\/([0-9a-f-]{36})$/i,
  );
  if (request.method === "DELETE" && sessionDeleteMatch) {
    const auth = await requireAuth(request, env);
    const sessionId = sessionDeleteMatch[1];
    await dbRun(
      env.DB,
      `UPDATE sessions
          SET revoked_at = ?1
        WHERE id = ?2 AND account_id = ?3`,
      new Date().toISOString(),
      sessionId,
      auth.accountId,
    );

    return json({ revoked: true, sessionId });
  }

  return null;
}
