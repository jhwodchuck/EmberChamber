import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import type { GroupMember, GroupThreadMessage } from "../types";
import { styles, theme } from "../styles";

export type MemberProfileSheetProps = {
  member: GroupMember;
  isSelf: boolean;
  threadMessages: GroupThreadMessage[];
  privateNote: string | null;
  isSavingNote: boolean;
  isOpeningDm: boolean;
  onClose: () => void;
  onSaveNote: (note: string) => void;
  onOpenDm: () => void;
  onSendContactRequest: () => void;
};

function roleBadgeLabel(role: GroupMember["role"]) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  return "Member";
}

function formatJoinDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

export function MemberProfileSheet({
  member,
  isSelf,
  threadMessages,
  privateNote,
  isSavingNote,
  isOpeningDm,
  onClose,
  onSaveNote,
  onOpenDm,
  onSendContactRequest,
}: MemberProfileSheetProps) {
  const [noteText, setNoteText] = useState(privateNote ?? "");
  const [noteDirty, setNoteDirty] = useState(false);

  // Sync when note is loaded from storage
  useEffect(() => {
    setNoteText(privateNote ?? "");
    setNoteDirty(false);
  }, [privateNote, member.accountId]);

  // Recent messages by this member in the current thread
  const memberMessages = threadMessages.filter(
    (m) => m.senderAccountId === member.accountId,
  );
  const recentMessages = memberMessages.slice(-3).reverse();

  const initial = member.displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.memberProfileSheet}>
          {/* Drag handle */}
          <View style={styles.memberProfileDrag} />

          {/* Header */}
          <View style={styles.memberProfileHeader}>
            <View style={styles.memberProfileAvatar}>
              <Text style={styles.memberProfileAvatarText}>{initial}</Text>
            </View>
            <View style={styles.memberProfileHeaderCopy}>
              <Text style={styles.memberProfileName}>{member.displayName}</Text>
              <View style={styles.memberProfileRoleRow}>
                <View
                  style={[
                    styles.roleBadge,
                    member.role === "owner"
                      ? styles.roleBadgeOwner
                      : member.role === "admin"
                        ? styles.roleBadgeAdmin
                        : styles.roleBadgeMember,
                  ]}
                >
                  <Text style={styles.roleBadgeLabel}>{roleBadgeLabel(member.role)}</Text>
                </View>
                {isSelf ? (
                  <View style={styles.roleBadgeSelf}>
                    <Text style={styles.roleBadgeLabel}>You</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Joined + activity */}
          <View style={styles.memberProfileMeta}>
            <Text style={styles.memberProfileMetaText}>
              Joined {formatJoinDate(member.joinedAt)}
            </Text>
            {member.messageCount > 0 ? (
              <Text style={styles.memberProfileMetaText}>
                {member.messageCount} message{member.messageCount === 1 ? "" : "s"} in room
              </Text>
            ) : null}
          </View>

          {/* Recent activity */}
          {recentMessages.length > 0 ? (
            <View style={styles.memberActivitySection}>
              <Text style={styles.memberActivityLabel}>Recent in this chat</Text>
              {recentMessages.map((msg) => (
                <View key={msg.id} style={styles.memberActivityRow}>
                  <Text style={styles.memberActivityText} numberOfLines={2}>
                    {msg.text ?? (msg.attachment ? `[${msg.attachment.contentClass}]` : "[message]")}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Private notes */}
          <View style={styles.memberNotesSection}>
            <View style={styles.memberNotesTitleRow}>
              <Text style={styles.memberNotesTitle}>Private notes</Text>
              <Text style={styles.memberNotesHint}>Only visible to you</Text>
            </View>
            <TextInput
              style={styles.memberNotesInput}
              multiline
              placeholder="Add a private note about this person…"
              placeholderTextColor={theme.colors.placeholder}
              value={noteText}
              onChangeText={(text) => {
                setNoteText(text);
                setNoteDirty(true);
              }}
            />
            {noteDirty ? (
              <Pressable
                style={isSavingNote ? styles.primaryButtonDisabled : styles.primaryButton}
                onPress={() => {
                  setNoteDirty(false);
                  onSaveNote(noteText);
                }}
                disabled={isSavingNote}
              >
                <Text style={styles.primaryButtonLabel}>
                  {isSavingNote ? "Saving…" : "Save note"}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Actions (not for self) */}
          {!isSelf ? (
            <View style={styles.memberProfileActions}>
              <Pressable
                style={[styles.primaryButton, isOpeningDm ? styles.primaryButtonDisabled : null]}
                onPress={onOpenDm}
                disabled={isOpeningDm}
              >
                <Text style={styles.primaryButtonLabel}>
                  {isOpeningDm ? "Opening…" : "Send DM"}
                </Text>
              </Pressable>

              <Pressable style={styles.secondaryButton} onPress={onSendContactRequest}>
                <Text style={styles.secondaryButtonLabel}>Contact request</Text>
              </Pressable>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
