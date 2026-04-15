import type { Dispatch, SetStateAction } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { GroupInvitePreview } from "../types";
import { styles, theme } from "../styles";
import { ScreenScaffold } from "../components/ScreenScaffold";

export type InvitesScreenProps = {
  inviteInput: string;
  setInviteInput: Dispatch<SetStateAction<string>>;
  invitePreview: GroupInvitePreview | null;
  invitePreviewError: string | null;
  isPreviewingInvite: boolean;
  isAcceptingInvite: boolean;
  groupCount: number;
  onPreviewInvite: () => void;
  onAcceptInvite: () => void;
  onOpenChats: () => void;
};

export function InvitesScreen({
  inviteInput,
  setInviteInput,
  invitePreview,
  invitePreviewError,
  isPreviewingInvite,
  isAcceptingInvite,
  groupCount,
  onPreviewInvite,
  onAcceptInvite,
  onOpenChats,
}: InvitesScreenProps) {
  return (
    <ScreenScaffold
      scrollable
      title="Invites"
      subtitle="Paste a trusted group invite here. Joined circles move straight into your chat list."
      headerAction={
        <Pressable
          style={styles.screenHeaderActionButton}
          onPress={onOpenChats}
        >
          <Text style={styles.screenHeaderActionLabel}>Chats</Text>
        </Pressable>
      }
    >
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Join a group</Text>
        <Text style={styles.sectionBody}>
          Invite-only access stays intact, but the act of joining should be
          quick and quiet.
        </Text>

        <TextInput
          autoCapitalize="none"
          placeholder="Paste an /invite/{groupId}/{token} link"
          placeholderTextColor={theme.colors.placeholder}
          style={styles.input}
          value={inviteInput}
          onChangeText={setInviteInput}
        />

        <View style={styles.buttonRow}>
          <Pressable
            style={[
              styles.secondaryButton,
              styles.buttonRowButton,
              isPreviewingInvite ? styles.primaryButtonDisabled : null,
            ]}
            onPress={onPreviewInvite}
            disabled={isPreviewingInvite}
          >
            <Text style={styles.secondaryButtonLabel}>
              {isPreviewingInvite ? "Previewing…" : "Preview"}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.primaryButton,
              styles.buttonRowButton,
              isAcceptingInvite || !inviteInput.trim()
                ? styles.primaryButtonDisabled
                : null,
            ]}
            onPress={onAcceptInvite}
            disabled={isAcceptingInvite || !inviteInput.trim()}
          >
            <Text style={styles.primaryButtonLabel}>
              {isAcceptingInvite ? "Joining…" : "Join"}
            </Text>
          </Pressable>
        </View>

        {invitePreviewError ? (
          <Text style={styles.errorText}>{invitePreviewError}</Text>
        ) : null}

        {invitePreview ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>{invitePreview.group.title}</Text>
            <Text style={styles.infoBody}>
              Invited by {invitePreview.invite.inviterDisplayName}. Members{" "}
              {invitePreview.group.memberCount}/{invitePreview.group.memberCap}.
              Status {invitePreview.invite.status}.
            </Text>
            {invitePreview.group.joinRuleText ? (
              <Text style={styles.helper}>
                {invitePreview.group.joinRuleText}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Current chat list</Text>
        <Text style={styles.sectionBody}>
          This phone currently sees {groupCount}{" "}
          {groupCount === 1 ? "circle" : "circles"}.
        </Text>
        <Pressable style={styles.secondaryButton} onPress={onOpenChats}>
          <Text style={styles.secondaryButtonLabel}>Open chats</Text>
        </Pressable>
      </View>
    </ScreenScaffold>
  );
}
