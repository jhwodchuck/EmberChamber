import type { GroupInvitePreview } from "../types";
import { relayUrl } from "../constants";
import { fetchRelayJson } from "./relayClient";

export function previewGroupInviteRequest(
  groupId: string,
  inviteToken: string,
) {
  return fetchRelayJson<GroupInvitePreview>(
    `${relayUrl}/v1/groups/${groupId}/invites/${encodeURIComponent(
      inviteToken,
    )}/preview`,
  );
}
