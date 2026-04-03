import type { Dispatch, SetStateAction } from "react";
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from "react-native";
import type {
  AuthSession,
  ContactCard,
  FormMessage,
  GroupInvitePreview,
  GroupMembershipSummary,
  GroupThreadMessage,
  MeProfile,
  PendingAttachment,
  PrivacyDefaults,
} from "../types";
import { formatBytes } from "../lib/utils";
import { styles, theme } from "../styles";
import { StatusCard } from "../components/StatusCard";
import { MessageBubble } from "../components/MessageBubble";
import { ToggleRow } from "../components/ToggleRow";

export type MainScreenProps = {
  session: AuthSession;
  profile: MeProfile | null;
  contactCard: ContactCard | null;
  groups: GroupMembershipSummary[];
  selectedConversationId: string | null;
  setSelectedConversationId: Dispatch<SetStateAction<string | null>>;
  selectedGroup: GroupMembershipSummary | null;
  threadMessages: GroupThreadMessage[];
  inviteInput: string;
  setInviteInput: Dispatch<SetStateAction<string>>;
  invitePreview: GroupInvitePreview | null;
  invitePreviewError: string | null;
  messageDraft: string;
  setMessageDraft: Dispatch<SetStateAction<string>>;
  pendingAttachment: PendingAttachment | null;
  setPendingAttachment: Dispatch<SetStateAction<PendingAttachment | null>>;
  isLoadingAccount: boolean;
  isLoadingThread: boolean;
  isPreviewingInvite: boolean;
  isAcceptingInvite: boolean;
  isPickingPhoto: boolean;
  isSendingMessage: boolean;
  deviceBundleReady: boolean;
  deviceBundleCount: number;
  deviceBundleError: string | null;
  vaultCount: number;
  privacyDefaults: PrivacyDefaults;
  sessionMessage: FormMessage | null;
  email: string;
  deviceLabel: string;
  onSignOut: () => void;
  onPreviewInvite: () => void;
  onAcceptInvite: () => void;
  onPickPhoto: () => void;
  onTakePhoto: () => void;
  onSendMessage: () => void;
  onUpdatePrivacy: <K extends keyof PrivacyDefaults>(key: K, value: PrivacyDefaults[K]) => void;
  onImageError: (messageId: string) => void;
};

export function MainScreen(props: MainScreenProps) {
  const {
    session, profile, contactCard, groups,
    selectedConversationId, setSelectedConversationId, selectedGroup,
    threadMessages, inviteInput, setInviteInput,
    invitePreview, invitePreviewError,
    messageDraft, setMessageDraft, pendingAttachment, setPendingAttachment,
    isLoadingAccount, isLoadingThread, isPreviewingInvite, isAcceptingInvite,
    isPickingPhoto, isSendingMessage,
    deviceBundleReady, deviceBundleCount, deviceBundleError,
    vaultCount, privacyDefaults, sessionMessage, email, deviceLabel,
    onSignOut, onPreviewInvite, onAcceptInvite, onPickPhoto, onTakePhoto, onSendMessage,
    onUpdatePrivacy, onImageError,
  } = props;

  return (
    <>
      {sessionMessage ? <StatusCard {...sessionMessage} /> : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account ready</Text>
        {isLoadingAccount ? (
          <View style={styles.inlineLoadingRow}>
            <ActivityIndicator size="small" color={theme.colors.textSoft} />
            <Text style={styles.helper}>Loading profile, device state, and current groups…</Text>
          </View>
        ) : (
          <>
            <View style={styles.metricRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Display name</Text>
                <Text style={styles.metricValueText}>
                  {profile?.displayName ?? "Loading…"}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Current device</Text>
                <Text style={styles.metricValueText}>{deviceLabel}</Text>
              </View>
            </View>
            <Text style={styles.helper}>
              {(profile?.email ?? email) || "This account email is loading."}
            </Text>

            {contactCard ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Contact card ready</Text>
                <Text style={styles.infoBody}>
                  Share this token later by QR or copy flow. The immediate goal is that this
                  phone now has a working relay session and registered delivery metadata.
                </Text>
                <Text selectable style={styles.codeText}>
                  {contactCard.cardToken}
                </Text>
              </View>
            ) : null}

            <View style={styles.metricRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Device registration</Text>
                <Text style={styles.metricValueText}>
                  {deviceBundleReady ? "Synced" : "Pending"}
                </Text>
                <Text style={styles.helper}>
                  {deviceBundleCount} visible bundle{deviceBundleCount === 1 ? "" : "s"} on the relay.
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Current groups</Text>
                <Text style={styles.metricValue}>{groups.length}</Text>
              </View>
            </View>

            {deviceBundleError ? (
              <Text style={styles.errorText}>{deviceBundleError}</Text>
            ) : null}

            <Pressable style={styles.secondaryButton} onPress={onSignOut}>
              <Text style={styles.secondaryButtonLabel}>Sign out</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Thread picker</Text>
        <Text style={styles.sectionBody}>
          Pick a group and send the first real message from this phone. If you do not have one
          yet, paste an invite right below.
        </Text>
        {groups.length ? (
          <View style={styles.groupSelectorRow}>
            {groups.map((group) => (
              <Pressable
                key={group.id}
                style={[
                  styles.groupSelectorChip,
                  selectedConversationId === group.id ? styles.groupSelectorChipActive : null,
                ]}
                onPress={() => {
                  setSelectedConversationId(group.id);
                  setPendingAttachment(null);
                }}
              >
                <Text
                  style={[
                    styles.groupSelectorLabel,
                    selectedConversationId === group.id ? styles.groupSelectorLabelActive : null,
                  ]}
                >
                  {group.title}
                </Text>
                <Text style={styles.groupSelectorMeta}>
                  {group.memberCount}/{group.memberCap}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.helper}>
            No groups attached yet. Paste a group invite below to get into a conversation fast.
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Join a group invite</Text>
        <Text style={styles.sectionBody}>
          Paste a trusted invite here to attach a new circle to this account without leaving the app.
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
              {isPreviewingInvite ? "Previewing…" : "Preview invite"}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.primaryButton,
              styles.buttonRowButton,
              isAcceptingInvite ? styles.primaryButtonPressed : null,
            ]}
            onPress={onAcceptInvite}
            disabled={isAcceptingInvite || !inviteInput.trim()}
          >
            <Text style={styles.primaryButtonLabel}>
              {isAcceptingInvite ? "Joining…" : "Join group"}
            </Text>
          </Pressable>
        </View>
        {invitePreviewError ? <Text style={styles.errorText}>{invitePreviewError}</Text> : null}
        {invitePreview ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>{invitePreview.group.title}</Text>
            <Text style={styles.infoBody}>
              Issued by {invitePreview.invite.inviterDisplayName}. Members{" "}
              {invitePreview.group.memberCount}/{invitePreview.group.memberCap}. Status{" "}
              {invitePreview.invite.status}.
            </Text>
            {invitePreview.group.joinRuleText ? (
              <Text style={styles.helper}>{invitePreview.group.joinRuleText}</Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {selectedGroup ? `${selectedGroup.title}` : "Conversation"}
        </Text>
        <Text style={styles.sectionBody}>
          {selectedGroup
            ? "This Android beta supports recent thread history, photo uploads, and message send for your current groups."
            : "Join or select a group to unlock the composer."}
        </Text>

        {selectedGroup ? (
          <>
            <View style={styles.threadMetaRow}>
              <Text style={styles.threadMetaText}>
                Role {selectedGroup.myRole}. Members {selectedGroup.memberCount}/{selectedGroup.memberCap}.
              </Text>
              <Text style={styles.threadMetaText}>
                Stronger media protections {selectedGroup.sensitiveMediaDefault ? "on" : "off"}.
              </Text>
            </View>

            {isLoadingThread ? (
              <View style={styles.threadList}>
                <View style={styles.skeletonBubble} />
                <View style={[styles.skeletonBubble, styles.skeletonBubbleSoft]} />
                <View style={[styles.skeletonBubble, styles.skeletonBubbleFaint]} />
              </View>
            ) : threadMessages.length ? (
              <View style={styles.threadList}>
                {threadMessages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwnMessage={message.senderAccountId === session.accountId}
                    onImageError={onImageError}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyThreadCard}>
                <Text style={styles.infoTitle}>No messages yet</Text>
                <Text style={styles.infoBody}>
                  Send a short note or attach a photo to make this phone's first delivery path real.
                </Text>
              </View>
            )}

            {pendingAttachment ? (
              <View style={styles.pendingAttachmentCard}>
                <View style={styles.pendingAttachmentHeader}>
                  <Text style={styles.infoTitle}>Ready to send</Text>
                  <Pressable onPress={() => setPendingAttachment(null)}>
                    <Text style={styles.inlineAction}>Remove</Text>
                  </Pressable>
                </View>
                <Image
                  source={{ uri: pendingAttachment.uri }}
                  style={styles.pendingAttachmentImage}
                  resizeMode="cover"
                />
                <Text style={styles.helper}>
                  {pendingAttachment.fileName} ·{" "}
                  {formatBytes(pendingAttachment.byteLength || 0)}
                </Text>
              </View>
            ) : null}

            <TextInput
              multiline
              placeholder="Write a short message"
              placeholderTextColor={theme.colors.placeholder}
              style={[styles.input, styles.composerInput]}
              value={messageDraft}
              onChangeText={setMessageDraft}
            />

            <View style={styles.buttonRow}>
              <Pressable
                style={[
                  styles.secondaryButton,
                  styles.buttonRowButton,
                ]}
                onPress={onTakePhoto}
                disabled={isPickingPhoto}
              >
                <Text style={styles.secondaryButtonLabel}>
                  {isPickingPhoto ? "Loading…" : "Take Photo"}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.secondaryButton,
                  styles.buttonRowButton,
                  isPickingPhoto ? styles.primaryButtonDisabled : null,
                ]}
                onPress={onPickPhoto}
                disabled={isPickingPhoto}
              >
                <Text style={styles.secondaryButtonLabel}>
                  {isPickingPhoto ? "Opening gallery…" : "Pick photo"}
                </Text>
              </Pressable>
            </View>
            <View style={styles.buttonRow}>
              <Pressable
                style={[
                  styles.primaryButton,
                  styles.buttonRowButton,
                  (!messageDraft.trim() && !pendingAttachment) || isSendingMessage
                    ? styles.primaryButtonDisabled
                    : null,
                ]}
                onPress={onSendMessage}
                disabled={(!messageDraft.trim() && !pendingAttachment) || isSendingMessage}
              >
                <Text style={styles.primaryButtonLabel}>
                  {isSendingMessage ? "Sending…" : "Send"}
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Text style={styles.helper}>
            Finish sign-in with a group invite or join a circle above. The fastest first-message path is a shared group thread, not a blank inbox.
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Local private vault</Text>
        <Text style={styles.sectionBody}>
          Sent sensitive media is now tracked locally so the vault reflects what this phone handled.
        </Text>
        <View style={styles.metricRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Vault items</Text>
            <Text style={styles.metricValue}>{vaultCount}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Export posture</Text>
            <Text style={styles.metricValue}>
              {privacyDefaults.allowSensitiveExport ? "Open" : "Locked"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Discreet device defaults</Text>
        <Text style={styles.sectionBody}>
          These settings stay local and now sit behind the first-message path instead of blocking it.
        </Text>

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Notification preview mode</Text>
          <View style={styles.segmentRow}>
            {(["discreet", "expanded", "none"] as const).map((mode) => (
              <Pressable
                key={mode}
                style={[
                  styles.segmentButton,
                  privacyDefaults.notificationPreviewMode === mode ? styles.segmentButtonActive : null,
                ]}
                onPress={() => onUpdatePrivacy("notificationPreviewMode", mode)}
              >
                <Text
                  style={[
                    styles.segmentButtonLabel,
                    privacyDefaults.notificationPreviewMode === mode
                      ? styles.segmentButtonLabelActive
                      : null,
                  ]}
                >
                  {mode}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <ToggleRow
          title="Auto-download sensitive media"
          description="Keep this off so intimate media does not silently accumulate on the device."
          value={privacyDefaults.autoDownloadSensitiveMedia}
          onPress={() =>
            onUpdatePrivacy(
              "autoDownloadSensitiveMedia",
              !privacyDefaults.autoDownloadSensitiveMedia,
            )
          }
        />
        <ToggleRow
          title="Allow sensitive export"
          description="Keep this off to discourage saving media outside the private vault."
          value={privacyDefaults.allowSensitiveExport}
          onPress={() =>
            onUpdatePrivacy(
              "allowSensitiveExport",
              !privacyDefaults.allowSensitiveExport,
            )
          }
        />
        <ToggleRow
          title="Secure app switcher"
          description="Request screenshot and app-switcher protection on supported devices."
          value={privacyDefaults.secureAppSwitcher}
          onPress={() =>
            onUpdatePrivacy("secureAppSwitcher", !privacyDefaults.secureAppSwitcher)
          }
        />
      </View>
    </>
  );
}
