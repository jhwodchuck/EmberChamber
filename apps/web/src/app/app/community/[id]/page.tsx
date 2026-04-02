"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { ConversationDetail } from "@emberchamber/protocol";
import { StatusCallout } from "@/components/status-callout";
import { relayConversationApi } from "@/lib/relay";

type RoomMemberSelection = Record<string, string>;

function defaultRoomMemberSelection(community: ConversationDetail): RoomMemberSelection {
  return Object.fromEntries(
    (community.rooms ?? []).map((room) => [room.id, community.members.find((member) => member.role === "member")?.accountId ?? ""]),
  );
}

export default function CommunityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "";
  const [community, setCommunity] = useState<ConversationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPolicies, setIsSavingPolicies] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    allowMemberInvites: false,
    inviteFreezeEnabled: false,
  });
  const [roomForm, setRoomForm] = useState({
    title: "",
    joinRuleText: "",
    sensitiveMediaDefault: false,
    roomAccessPolicy: "all_members" as "all_members" | "restricted",
    memberAccountIds: [] as string[],
  });
  const [inviteForm, setInviteForm] = useState({
    scope: "conversation" as "conversation" | "room",
    roomId: "",
    expiresInHours: 72,
    maxUses: 25,
    note: "",
  });
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [roomSelections, setRoomSelections] = useState<RoomMemberSelection>({});
  const [busyRoomId, setBusyRoomId] = useState<string | null>(null);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);

  const refreshCommunity = useCallback(async () => {
    const data = await relayConversationApi.get(id);
    if (data.kind !== "community") {
      router.replace(`/app/chat/${id}`);
      return;
    }

    setCommunity(data);
    setPolicyForm({
      allowMemberInvites: Boolean(data.allowMemberInvites),
      inviteFreezeEnabled: Boolean(data.inviteFreezeEnabled),
    });
    setRoomSelections((current) => ({ ...defaultRoomMemberSelection(data), ...current }));
  }, [id, router]);

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      try {
        await refreshCommunity();
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load community");
          router.push("/app");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, refreshCommunity, router]);

  async function handleSavePolicies(event: React.FormEvent) {
    event.preventDefault();
    setIsSavingPolicies(true);
    try {
      const updated = await relayConversationApi.updateCommunityPolicies(id, policyForm);
      setCommunity(updated);
      toast.success("Community policies updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update policies");
    } finally {
      setIsSavingPolicies(false);
    }
  }

  async function handleCreateRoom(event: React.FormEvent) {
    event.preventDefault();
    if (!roomForm.title.trim()) {
      toast.error("Room title is required");
      return;
    }

    setIsCreatingRoom(true);
    try {
      await relayConversationApi.createRoom(id, {
        title: roomForm.title.trim(),
        joinRuleText: roomForm.joinRuleText.trim() || undefined,
        sensitiveMediaDefault: roomForm.sensitiveMediaDefault,
        roomAccessPolicy: roomForm.roomAccessPolicy,
        memberAccountIds:
          roomForm.roomAccessPolicy === "restricted" ? roomForm.memberAccountIds : undefined,
      });
      await refreshCommunity();
      setRoomForm({
        title: "",
        joinRuleText: "",
        sensitiveMediaDefault: false,
        roomAccessPolicy: "all_members",
        memberAccountIds: [],
      });
      toast.success("Room created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create room");
    } finally {
      setIsCreatingRoom(false);
    }
  }

  async function handleCreateInvite(event: React.FormEvent) {
    event.preventDefault();
    setIsCreatingInvite(true);
    setCreatedInviteUrl(null);
    try {
      const invite = await relayConversationApi.createInvite(id, {
        scope: inviteForm.scope,
        roomId: inviteForm.scope === "room" ? inviteForm.roomId : undefined,
        expiresInHours: inviteForm.expiresInHours,
        maxUses: inviteForm.maxUses,
        note: inviteForm.note.trim() || undefined,
      });
      setCreatedInviteUrl(invite.inviteUrl);
      toast.success("Invite created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create invite");
    } finally {
      setIsCreatingInvite(false);
    }
  }

  async function copyInviteLink() {
    if (!createdInviteUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdInviteUrl);
      toast.success("Invite link copied");
    } catch {
      toast.error("Clipboard access failed");
    }
  }

  async function toggleRoomMember(roomId: string) {
    const accountId = roomSelections[roomId];
    if (!accountId || !community) {
      return;
    }

    const room = community.rooms?.find((entry) => entry.id === roomId);
    if (!room) {
      return;
    }

    setBusyRoomId(roomId);
    setBusyMemberId(accountId);
    try {
      if (room.memberAccountIds.includes(accountId)) {
        await relayConversationApi.removeRoomMember(id, roomId, accountId);
        toast.success("Room access removed");
      } else {
        await relayConversationApi.addRoomMember(id, roomId, accountId);
        toast.success("Room access granted");
      }
      await refreshCommunity();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update room access");
    } finally {
      setBusyRoomId(null);
      setBusyMemberId(null);
    }
  }

  async function removeCommunityMember(accountId: string) {
    setBusyMemberId(accountId);
    try {
      await relayConversationApi.removeCommunityMember(id, accountId);
      await refreshCommunity();
      toast.success("Community member removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    } finally {
      setBusyMemberId(null);
    }
  }

  if (isLoading || !community) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const canManagePolicies = community.capabilities.canManagePolicies;
  const canManageRooms = community.capabilities.canManageRooms;
  const canGrantRoomAccess = community.capabilities.canGrantRoomAccess;
  const roomOptions = community.rooms ?? [];
  const memberOptions = community.members.filter((member) => member.role !== "owner");

  return (
    <div className="space-y-8 p-6 sm:p-8">
      <section className="panel px-6 py-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
              Invite-gated community
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
              {community.title ?? "Untitled community"}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              {community.joinRuleText ??
                "Use the browser to manage invite policy, room access, and joined-space search without opening public discovery."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href={`/app/search?communityId=${community.id}`} className="btn-ghost">
              Search This Community
            </Link>
            <Link href="/app/new-community" className="btn-ghost">
              New Community
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.3rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Members</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{community.memberCount}</p>
          </div>
          <div className="rounded-[1.3rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Rooms</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{roomOptions.length}</p>
          </div>
          <div className="rounded-[1.3rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Invite policy</p>
            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
              {community.inviteFreezeEnabled
                ? "Frozen"
                : community.allowMemberInvites
                  ? "Members can invite"
                  : "Organizer-only invites"}
            </p>
          </div>
        </div>
      </section>

      {canManagePolicies ? (
        <section className="panel px-6 py-7">
          <h3 className="text-xl font-semibold text-[var(--text-primary)]">Policies</h3>
          <form onSubmit={handleSavePolicies} className="mt-5 space-y-4">
            <label className="flex items-start gap-3 rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
              <input
                type="checkbox"
                checked={policyForm.allowMemberInvites}
                onChange={(event) =>
                  setPolicyForm((current) => ({ ...current, allowMemberInvites: event.target.checked }))
                }
                className="mt-1 h-4 w-4 rounded border-[var(--border)] text-brand-600"
              />
              <span>
                <span className="block text-sm font-medium text-[var(--text-primary)]">
                  Allow member invites
                </span>
                <span className="mt-1 block text-sm leading-6 text-[var(--text-secondary)]">
                  Trusted members can mint invites when the community policy allows it.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
              <input
                type="checkbox"
                checked={policyForm.inviteFreezeEnabled}
                onChange={(event) =>
                  setPolicyForm((current) => ({ ...current, inviteFreezeEnabled: event.target.checked }))
                }
                className="mt-1 h-4 w-4 rounded border-[var(--border)] text-brand-600"
              />
              <span>
                <span className="block text-sm font-medium text-[var(--text-primary)]">
                  Freeze new joins
                </span>
                <span className="mt-1 block text-sm leading-6 text-[var(--text-secondary)]">
                  Existing invites stop working until organizers unfreeze the community.
                </span>
              </span>
            </label>

            <button type="submit" className="btn-primary" disabled={isSavingPolicies}>
              {isSavingPolicies ? "Saving Policies…" : "Save Policies"}
            </button>
          </form>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <section className="panel px-6 py-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)]">Rooms</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Rooms stay scoped to members of this community. Restricted rooms need explicit
                  access grants from organizers.
                </p>
              </div>
              {canManageRooms ? (
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                  Organizer controls enabled
                </span>
              ) : null}
            </div>

            <div className="mt-6 space-y-4">
              {roomOptions.map((room) => {
                const selectedAccountId = roomSelections[room.id] ?? "";
                const selectedMember = community.members.find((member) => member.accountId === selectedAccountId);
                const accessActionLabel =
                  selectedAccountId && room.memberAccountIds.includes(selectedAccountId)
                    ? "Remove Access"
                    : "Grant Access";

                return (
                  <div
                    key={room.id}
                    className="rounded-[1.3rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-[var(--text-primary)]">
                          {room.title ?? "Untitled room"}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {room.memberCount} members, {room.roomAccessPolicy?.replace("_", " ")} access
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/app/chat/${room.id}`} className="btn-ghost">
                          Open Room
                        </Link>
                        <Link href={`/app/search?communityId=${community.id}`} className="btn-ghost">
                          Search Scope
                        </Link>
                      </div>
                    </div>

                    {canGrantRoomAccess && room.roomAccessPolicy === "restricted" ? (
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <select
                          value={selectedAccountId}
                          onChange={(event) =>
                            setRoomSelections((current) => ({ ...current, [room.id]: event.target.value }))
                          }
                          className="input flex-1"
                        >
                          <option value="">Select a community member</option>
                          {memberOptions.map((member) => (
                            <option key={member.accountId} value={member.accountId}>
                              {member.displayName} ({member.role})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => void toggleRoomMember(room.id)}
                          className="btn-primary"
                          disabled={!selectedAccountId || busyRoomId === room.id}
                        >
                          {busyRoomId === room.id && busyMemberId === selectedAccountId
                            ? "Updating…"
                            : accessActionLabel}
                        </button>
                        {selectedMember ? (
                          <p className="self-center text-xs text-[var(--text-secondary)]">
                            {room.memberAccountIds.includes(selectedMember.accountId)
                              ? "Selected member already has room access."
                              : "Selected member is in the community but not this room yet."}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          {canManageRooms ? (
            <section className="panel px-6 py-7">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">Create a Room</h3>
              <form onSubmit={handleCreateRoom} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                    Room title
                  </label>
                  <input
                    type="text"
                    value={roomForm.title}
                    onChange={(event) => setRoomForm((current) => ({ ...current, title: event.target.value }))}
                    className="input"
                    maxLength={80}
                    placeholder="Hosts only"
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                      Access policy
                    </label>
                    <select
                      value={roomForm.roomAccessPolicy}
                      onChange={(event) =>
                        setRoomForm((current) => ({
                          ...current,
                          roomAccessPolicy: event.target.value as "all_members" | "restricted",
                        }))
                      }
                      className="input"
                    >
                      <option value="all_members">All community members</option>
                      <option value="restricted">Restricted room</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                      Media defaults
                    </label>
                    <label className="flex items-center gap-3 rounded-[1rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
                      <input
                        type="checkbox"
                        checked={roomForm.sensitiveMediaDefault}
                        onChange={(event) =>
                          setRoomForm((current) => ({
                            ...current,
                            sensitiveMediaDefault: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-[var(--border)] text-brand-600"
                      />
                      <span className="text-sm text-[var(--text-secondary)]">Use stronger defaults</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                    Room rule
                  </label>
                  <textarea
                    value={roomForm.joinRuleText}
                    onChange={(event) =>
                      setRoomForm((current) => ({ ...current, joinRuleText: event.target.value }))
                    }
                    className="input resize-none"
                    rows={3}
                    maxLength={500}
                    placeholder="Who belongs here, and what should not leak out?"
                  />
                </div>

                {roomForm.roomAccessPolicy === "restricted" ? (
                  <div>
                    <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                      Seed access for these members
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {memberOptions.map((member) => (
                        <label
                          key={member.accountId}
                          className="flex items-center gap-3 rounded-[1rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3"
                        >
                          <input
                            type="checkbox"
                            checked={roomForm.memberAccountIds.includes(member.accountId)}
                            onChange={(event) =>
                              setRoomForm((current) => ({
                                ...current,
                                memberAccountIds: event.target.checked
                                  ? Array.from(new Set([...current.memberAccountIds, member.accountId]))
                                  : current.memberAccountIds.filter((accountId) => accountId !== member.accountId),
                              }))
                            }
                            className="h-4 w-4 rounded border-[var(--border)] text-brand-600"
                          />
                          <span className="text-sm text-[var(--text-secondary)]">
                            {member.displayName} ({member.role})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}

                <button type="submit" className="btn-primary" disabled={isCreatingRoom}>
                  {isCreatingRoom ? "Creating Room…" : "Create Room"}
                </button>
              </form>
            </section>
          ) : null}
        </div>

        <div className="space-y-6">
          <section className="panel px-6 py-7">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">Mint an Invite</h3>
            {!community.capabilities.canCreateInvites ? (
              <StatusCallout tone="info" title="Invite creation is currently organizer-only">
                Member-created invites stay disabled until organizers enable them for this
                community.
              </StatusCallout>
            ) : null}
            <form onSubmit={handleCreateInvite} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                  Invite scope
                </label>
                <select
                  value={inviteForm.scope}
                  onChange={(event) =>
                    setInviteForm((current) => ({
                      ...current,
                      scope: event.target.value as "conversation" | "room",
                    }))
                  }
                  className="input"
                >
                  <option value="conversation">Community invite</option>
                  <option value="room">Room-scoped invite</option>
                </select>
              </div>

              {inviteForm.scope === "room" ? (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                    Target room
                  </label>
                  <select
                    value={inviteForm.roomId}
                    onChange={(event) =>
                      setInviteForm((current) => ({ ...current, roomId: event.target.value }))
                    }
                    className="input"
                  >
                    <option value="">Select a room</option>
                    {roomOptions.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                    Expires in
                  </label>
                  <select
                    value={String(inviteForm.expiresInHours)}
                    onChange={(event) =>
                      setInviteForm((current) => ({
                        ...current,
                        expiresInHours: Number(event.target.value),
                      }))
                    }
                    className="input"
                  >
                    {[24, 72, 168, 336].map((hours) => (
                      <option key={hours} value={hours}>
                        {hours < 168 ? `${hours} hours` : `${hours / 24} days`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                    Max uses
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={inviteForm.maxUses}
                    onChange={(event) =>
                      setInviteForm((current) => ({ ...current, maxUses: Number(event.target.value) }))
                    }
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                  Invite note
                </label>
                <textarea
                  value={inviteForm.note}
                  onChange={(event) =>
                    setInviteForm((current) => ({ ...current, note: event.target.value }))
                  }
                  className="input resize-none"
                  rows={3}
                  maxLength={240}
                  placeholder="Review the rules and room scope before posting."
                />
              </div>

              {createdInviteUrl ? (
                <StatusCallout tone="success" title="Invite ready">
                  <span className="break-all font-mono text-xs">{createdInviteUrl}</span>
                </StatusCallout>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    !community.capabilities.canCreateInvites ||
                    isCreatingInvite ||
                    (inviteForm.scope === "room" && !inviteForm.roomId)
                  }
                >
                  {isCreatingInvite ? "Creating Invite…" : "Create Invite"}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => void copyInviteLink()}
                  disabled={!createdInviteUrl}
                >
                  Copy Invite Link
                </button>
              </div>
            </form>
          </section>

          <section className="panel px-6 py-7">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">Members</h3>
            <div className="mt-5 space-y-3">
              {community.members.map((member) => (
                <div
                  key={member.accountId}
                  className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{member.displayName}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                      {member.role}
                    </p>
                  </div>
                  {community.capabilities.canManageMembers &&
                  member.role !== "owner" &&
                  busyMemberId !== member.accountId ? (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => void removeCommunityMember(member.accountId)}
                    >
                      Remove
                    </button>
                  ) : busyMemberId === member.accountId ? (
                    <span className="text-xs text-[var(--text-secondary)]">Updating…</span>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
