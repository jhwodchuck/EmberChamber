import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import type { GroupMember } from "../types";
import { styles } from "../styles";

export type MemberRosterModalProps = {
  members: GroupMember[];
  isLoading: boolean;
  myAccountId: string;
  onSelectMember: (member: GroupMember) => void;
  onClose: () => void;
};

function roleBadgeLabel(role: GroupMember["role"]) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  return null;
}

export function MemberRosterModal({
  members,
  isLoading,
  myAccountId,
  onSelectMember,
  onClose,
}: MemberRosterModalProps) {
  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.memberRosterSheet}>
          <View style={styles.memberProfileDrag} />

          <Text style={styles.modalTitle}>
            Members{members.length ? ` (${members.length})` : ""}
          </Text>

          {isLoading ? (
            <View style={styles.memberRosterLoading}>
              <ActivityIndicator size="small" color={styles.primaryButton.backgroundColor} />
              <Text style={styles.memberRosterLoadingText}>Loading…</Text>
            </View>
          ) : members.length === 0 ? (
            <View style={styles.memberRosterLoading}>
              <Text style={styles.memberRosterLoadingText}>No members found.</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.memberRosterScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {members.map((member) => {
                const badge = roleBadgeLabel(member.role);
                const isSelf = member.accountId === myAccountId;
                const initial = member.displayName.trim().charAt(0).toUpperCase() || "?";

                return (
                  <Pressable
                    key={member.accountId}
                    style={styles.memberRosterRow}
                    onPress={() => onSelectMember(member)}
                    android_ripple={{ color: "rgba(255,255,255,0.06)" }}
                  >
                    <View style={styles.memberRosterAvatar}>
                      <Text style={styles.memberRosterAvatarText}>{initial}</Text>
                    </View>

                    <View style={styles.memberRosterCopy}>
                      <Text style={styles.memberRosterName} numberOfLines={1}>
                        {member.displayName}
                        {isSelf ? "  (you)" : ""}
                      </Text>
                      {member.messageCount > 0 ? (
                        <Text style={styles.memberRosterMeta}>
                          {member.messageCount} message{member.messageCount === 1 ? "" : "s"}
                        </Text>
                      ) : null}
                    </View>

                    {badge ? (
                      <View
                        style={[
                          styles.roleBadge,
                          member.role === "owner" ? styles.roleBadgeOwner : styles.roleBadgeAdmin,
                        ]}
                      >
                        <Text style={styles.roleBadgeLabel}>{badge}</Text>
                      </View>
                    ) : null}

                    <Text style={styles.memberRosterChevron}>›</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
