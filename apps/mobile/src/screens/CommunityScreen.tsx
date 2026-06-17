import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import type {
  AuthSession,
  CommunityDetail,
  CommunityListEntry,
  CommunityMember,
  CommunityRoom,
  ConversationInviteDescriptor,
  GroupMembershipSummary,
} from "../types";
import {
  createCommunityInvite,
  fetchCommunityDetail,
  listCommunityInvites,
  removeCommunityMember,
  revokeCommunityInvite,
  updateCommunityPolicies,
} from "../lib/communityApi";
import { communityScreenStyles as styles, communityScreenColors as colors } from "./communityScreen.styles";

type RelayFetch = <T>(
  session: AuthSession,
  path: string,
  init?: RequestInit,
  allowRefresh?: boolean,
) => Promise<T>;

export type CommunityScreenProps = {
  session: AuthSession;
  community: CommunityListEntry;
  relayFetch: RelayFetch;
  onOpenRoom: (syntheticGroup: GroupMembershipSummary) => void;
  onBack: () => void;
};

function roomToSyntheticGroup(
  room: CommunityRoom,
  community: CommunityListEntry,
  myAccountId: string,
  members: CommunityMember[],
): GroupMembershipSummary {
  const me = members.find((m) => m.accountId === myAccountId);
  const roleStr = me?.role ?? "";
  const myRole: GroupMembershipSummary["myRole"] =
    roleStr === "owner"
      ? "owner"
      : roleStr === "admin" || community.capabilities.canManageMembers
        ? "admin"
        : "member";

  return {
    id: room.id,
    title: room.title,
    epoch: room.epoch,
    historyMode: "relay_hosted",
    memberCount: room.memberCount,
    memberCap: room.memberCap,
    myRole,
    sensitiveMediaDefault: community.sensitiveMediaDefault,
    joinRuleText: null,
    allowMemberInvites: community.allowMemberInvites,
    inviteFreezeEnabled: community.inviteFreezeEnabled,
    canCreateInvites: community.capabilities.canGrantRoomAccess,
    canManageMembers: community.capabilities.canManageMembers,
    createdAt: community.updatedAt,
    updatedAt: community.updatedAt,
  };
}

function inviteStatusLabel(
  inv: ConversationInviteDescriptor,
): string {
  const uses =
    inv.maxUses != null ? `${inv.useCount}/${inv.maxUses} uses` : `${inv.useCount} uses`;
  const scopeLabel = inv.scope === "room" ? ` · room: ${inv.targetRoomTitle ?? "?"}` : "";
  return `${inv.status} · ${uses}${scopeLabel}`;
}

export function CommunityScreen({
  session,
  community,
  relayFetch,
  onOpenRoom,
  onBack,
}: CommunityScreenProps) {
  const [detail, setDetail] = useState<CommunityDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [invites, setInvites] = useState<ConversationInviteDescriptor[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [isUpdatingPolicy, setIsUpdatingPolicy] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);
  const [roomSearch, setRoomSearch] = useState("");

  const loadDetail = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const next = await fetchCommunityDetail(
        relayFetch,
        session,
        community.id,
      );
      setDetail(next);
    } catch {
      setLoadError("Could not load community details.");
    } finally {
      setIsLoading(false);
    }
  }, [community.id, relayFetch, session]);

  const loadInvites = useCallback(async () => {
    if (!community.capabilities.canCreateInvites) {
      return;
    }
    setIsLoadingInvites(true);
    try {
      const next = await listCommunityInvites(relayFetch, session, community.id);
      setInvites(next);
    } catch {
      // Non-critical; leave existing list
    } finally {
      setIsLoadingInvites(false);
    }
  }, [community.capabilities.canCreateInvites, community.id, relayFetch, session]);

  useEffect(() => {
    void loadDetail();
    void loadInvites();
  }, [loadDetail, loadInvites]);

  async function handleTogglePolicy(
    key: "allowMemberInvites" | "inviteFreezeEnabled" | "sensitiveMediaDefault",
    value: boolean,
  ) {
    if (isUpdatingPolicy || !detail) {
      return;
    }
    const prev = {
      allowMemberInvites: detail.allowMemberInvites,
      inviteFreezeEnabled: detail.inviteFreezeEnabled,
      sensitiveMediaDefault: detail.sensitiveMediaDefault,
    };
    setDetail({ ...detail, [key]: value });
    setIsUpdatingPolicy(true);
    try {
      await updateCommunityPolicies(relayFetch, session, community.id, {
        [key]: value,
      });
    } catch {
      setDetail({ ...detail, ...prev });
    } finally {
      setIsUpdatingPolicy(false);
    }
  }

  async function handleCreateInvite() {
    if (isCreatingInvite) {
      return;
    }
    setIsCreatingInvite(true);
    try {
      await createCommunityInvite(relayFetch, session, community.id);
      await loadInvites();
    } catch {
      // Best-effort
    } finally {
      setIsCreatingInvite(false);
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    if (revokingInviteId) {
      return;
    }
    setRevokingInviteId(inviteId);
    try {
      await revokeCommunityInvite(relayFetch, session, community.id, inviteId);
      setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
    } catch {
      // Best-effort
    } finally {
      setRevokingInviteId(null);
    }
  }

  async function handleRemoveMember(accountId: string) {
    if (removingMemberId) {
      return;
    }
    setRemovingMemberId(accountId);
    try {
      await removeCommunityMember(
        relayFetch,
        session,
        community.id,
        accountId,
      );
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.filter((m) => m.accountId !== accountId),
              memberCount: prev.memberCount - 1,
            }
          : prev,
      );
    } catch {
      // Best-effort
    } finally {
      setRemovingMemberId(null);
    }
  }

  function handleOpenRoom(room: CommunityRoom) {
    const members = detail?.members ?? [];
    const synth = roomToSyntheticGroup(
      room,
      community,
      session.accountId,
      members,
    );
    onOpenRoom(synth);
  }

  const allRooms = detail?.rooms ?? [];
  const normalizedSearch = roomSearch.trim().toLowerCase();
  const rooms = normalizedSearch
    ? allRooms.filter((r) =>
        r.title.toLowerCase().includes(normalizedSearch),
      )
    : allRooms;
  const members = detail?.members ?? [];
  const { capabilities } = community;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backLabel}>← Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>{community.title}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>
                {community.memberCount} members
              </Text>
            </View>
            {community.roomCount > 0 ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>
                  {community.roomCount} rooms
                </Text>
              </View>
            ) : null}
            {community.joinRuleText ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>{community.joinRuleText}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {community.inviteFreezeEnabled ? (
          <View style={styles.freezeBanner}>
            <Text style={styles.freezeBannerText}>
              Invites are frozen — new joins are paused.
            </Text>
          </View>
        ) : null}

        {isLoading ? (
          <Text style={styles.loadingText}>Loading…</Text>
        ) : loadError ? (
          <Text style={styles.errorText}>{loadError}</Text>
        ) : (
          <>
            <TextInput
              placeholder="Search rooms and members…"
              placeholderTextColor={colors.placeholder}
              style={styles.searchInput}
              value={roomSearch}
              onChangeText={setRoomSearch}
              returnKeyType="search"
            />

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {normalizedSearch ? `Rooms matching "${roomSearch}"` : "Rooms"}
                </Text>
              </View>
              {rooms.length === 0 ? (
                <View style={styles.emptyRooms}>
                  <Text style={styles.emptyRoomsText}>No rooms yet.</Text>
                </View>
              ) : (
                rooms.map((room, idx) => (
                  <Pressable
                    key={room.id}
                    style={[
                      styles.roomRow,
                      idx === rooms.length - 1 ? styles.roomRowLast : null,
                    ]}
                    onPress={() => handleOpenRoom(room)}
                    android_ripple={{ color: "rgba(255,255,255,0.06)" }}
                  >
                    <View style={styles.roomIcon}>
                      <Text style={styles.roomIconText}>#</Text>
                    </View>
                    <View style={styles.roomInfo}>
                      <Text style={styles.roomTitle}>{room.title}</Text>
                      <Text style={styles.roomMeta}>
                        {room.memberCount} members
                        {room.roomAccessPolicy === "restricted"
                          ? " · restricted"
                          : ""}
                      </Text>
                    </View>
                    <Text style={styles.roomArrow}>›</Text>
                  </Pressable>
                ))
              )}
            </View>

            {capabilities.canManagePolicies ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Policies</Text>
                </View>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleLabel}>Allow member invites</Text>
                    <Text style={styles.toggleHint}>
                      Members can create invite links
                    </Text>
                  </View>
                  <Switch
                    value={detail?.allowMemberInvites ?? false}
                    onValueChange={(v) =>
                      void handleTogglePolicy("allowMemberInvites", v)
                    }
                    disabled={isUpdatingPolicy}
                  />
                </View>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleLabel}>Freeze invites</Text>
                    <Text style={styles.toggleHint}>
                      Pause all new joins
                    </Text>
                  </View>
                  <Switch
                    value={detail?.inviteFreezeEnabled ?? false}
                    onValueChange={(v) =>
                      void handleTogglePolicy("inviteFreezeEnabled", v)
                    }
                    disabled={isUpdatingPolicy}
                  />
                </View>
                <View style={[styles.toggleRow, styles.toggleRowLast]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleLabel}>Sensitive media default</Text>
                    <Text style={styles.toggleHint}>
                      Blur media for new members by default
                    </Text>
                  </View>
                  <Switch
                    value={detail?.sensitiveMediaDefault ?? false}
                    onValueChange={(v) =>
                      void handleTogglePolicy("sensitiveMediaDefault", v)
                    }
                    disabled={isUpdatingPolicy}
                  />
                </View>
              </View>
            ) : null}

            {capabilities.canCreateInvites ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Invites</Text>
                </View>
                {isLoadingInvites ? (
                  <Text style={styles.loadingText}>Loading invites…</Text>
                ) : invites.length === 0 ? (
                  <View style={styles.emptyRooms}>
                    <Text style={styles.emptyRoomsText}>No active invites.</Text>
                  </View>
                ) : (
                  invites.map((inv, idx) => (
                    <View
                      key={inv.id}
                      style={[
                        styles.inviteRow,
                        idx === invites.length - 1 ? styles.inviteRowLast : null,
                      ]}
                    >
                      <Text style={styles.inviteToken} numberOfLines={1}>
                        …{inv.inviteToken.slice(-12)}
                      </Text>
                      <Text style={styles.inviteStatus}>
                        {inviteStatusLabel(inv)}
                      </Text>
                      <View style={styles.inviteActions}>
                        {inv.status === "active" ? (
                          <Pressable
                            style={styles.revokeButton}
                            onPress={() => void handleRevokeInvite(inv.id)}
                            disabled={revokingInviteId === inv.id}
                          >
                            <Text style={styles.revokeButtonLabel}>
                              {revokingInviteId === inv.id
                                ? "Revoking…"
                                : "Revoke"}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  ))
                )}
                <Pressable
                  style={[
                    styles.primaryButton,
                    community.inviteFreezeEnabled
                      ? { opacity: 0.5 }
                      : null,
                  ]}
                  onPress={() => void handleCreateInvite()}
                  disabled={isCreatingInvite || community.inviteFreezeEnabled}
                >
                  <Text style={styles.primaryButtonLabel}>
                    {isCreatingInvite
                      ? "Creating…"
                      : "Create invite link"}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {capabilities.canManageMembers ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    Members ({members.length})
                  </Text>
                </View>
                {members.map((member, idx) => (
                  <View
                    key={member.accountId}
                    style={[
                      styles.memberRow,
                      idx === members.length - 1 ? styles.memberRowLast : null,
                    ]}
                  >
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {member.displayName.trim().charAt(0).toUpperCase() ||
                          "?"}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {member.displayName}
                      </Text>
                      <Text style={styles.memberRole}>
                        {member.role} · @{member.username}
                      </Text>
                    </View>
                    {member.accountId !== session.accountId &&
                    member.role !== "owner" ? (
                      <Pressable
                        style={styles.removeButton}
                        onPress={() =>
                          void handleRemoveMember(member.accountId)
                        }
                        disabled={removingMemberId === member.accountId}
                      >
                        <Text style={styles.removeButtonLabel}>
                          {removingMemberId === member.accountId
                            ? "Removing…"
                            : "Remove"}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
