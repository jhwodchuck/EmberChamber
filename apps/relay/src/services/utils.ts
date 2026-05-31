import type { Env } from "../types";

export function conversationTitleForAccount(accountId: string): string {
  return `Member ${accountId.slice(0, 8)}`;
}

export function accountUsername(accountId: string): string {
  return `member-${accountId.slice(0, 8)}`;
}

export function publicWebUrl(env: Env): string {
  return (
    env.EMBERCHAMBER_WEB_PUBLIC_URL ?? env.EMBERCHAMBER_RELAY_PUBLIC_URL
  ).replace(/\/$/, "");
}

export function attachmentMetadataSecret(env: Env): string {
  return `${env.EMBERCHAMBER_ATTACHMENT_TOKEN_SECRET}:metadata`;
}
