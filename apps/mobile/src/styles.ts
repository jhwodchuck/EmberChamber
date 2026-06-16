import { Platform, StyleSheet } from "react-native";
import {
  borderRadius as sharedBorderRadius,
  colorRoles,
  elevationRoles,
  spacing as sharedSpacing,
} from "@emberchamber/ui/tokens";

function tokenToPx(value: string) {
  if (value.endsWith("rem")) {
    return Number.parseFloat(value) * 16;
  }

  if (value.endsWith("px")) {
    return Number.parseFloat(value);
  }

  return Number.parseFloat(value);
}

const colors = {
  background: colorRoles.appBackground,
  panel: colorRoles.panel,
  panelStrong: colorRoles.panelStrong,
  surface: colorRoles.surface,
  surfaceStrong: colorRoles.surfaceStrong,
  border: colorRoles.border,
  borderStrong: colorRoles.borderStrong,
  brand: colorRoles.brandPrimary,
  brandPressed: colorRoles.brandPrimaryPressed,
  brandSoft: colorRoles.brandSoft,
  brandMuted: colorRoles.brandMuted,
  textPrimary: colorRoles.textPrimary,
  textSecondary: colorRoles.textSecondary,
  textMuted: colorRoles.textMuted,
  textSoft: colorRoles.textSoft,
  placeholder: colorRoles.placeholder,
  inputBackground: colorRoles.inputBackground,
  inputBorder: colorRoles.inputBorder,
  successBorder: colorRoles.successBorder,
  successBackground: colorRoles.successBackground,
  warningBorder: colorRoles.warningBorder,
  warningBackground: colorRoles.warningBackground,
  errorBorder: colorRoles.errorBorder,
  errorBackground: colorRoles.errorBackground,
  errorText: colorRoles.errorText,
};

const displayFontFamily = Platform.select({
  ios: undefined,
  android: undefined,
  default: undefined,
});

const panelShadow = {
  ...elevationRoles.panel,
} as const;

const brandShadow = {
  ...elevationRoles.brand,
} as const;

const radius = {
  sm: tokenToPx(sharedBorderRadius.sm),
  base: tokenToPx(sharedBorderRadius.base),
  md: tokenToPx(sharedBorderRadius.md),
  lg: tokenToPx(sharedBorderRadius.lg),
  xl: tokenToPx(sharedBorderRadius.xl),
  xxl: tokenToPx(sharedBorderRadius["2xl"]),
  xxxl: tokenToPx(sharedBorderRadius["3xl"]),
  full: tokenToPx(sharedBorderRadius.full),
};

const spacing = {
  1: tokenToPx(sharedSpacing[1]),
  2: tokenToPx(sharedSpacing[2]),
  3: tokenToPx(sharedSpacing[3]),
  4: tokenToPx(sharedSpacing[4]),
  5: tokenToPx(sharedSpacing[5]),
  6: tokenToPx(sharedSpacing[6]),
  7: tokenToPx(sharedSpacing[7]),
  8: tokenToPx(sharedSpacing[8]),
  10: tokenToPx(sharedSpacing[10]),
  12: tokenToPx(sharedSpacing[12]),
  16: tokenToPx(sharedSpacing[16]),
} as const;

export const theme = {
  colors,
  displayFontFamily,
};

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    position: "relative",
  },
  // Android IME resize needs each flex boundary above the thread list to be
  // allowed to shrink, otherwise the list can keep too much height and push
  // the composer below the visible viewport.
  keyboardShell: {
    flex: 1,
    minHeight: 0,
  },
  backgroundOrbTop: {
    position: "absolute",
    top: -160,
    right: -120,
    width: 280,
    height: 280,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 173, 112, 0.08)",
  },
  backgroundOrbLeft: {
    position: "absolute",
    top: 160,
    left: -150,
    width: 220,
    height: 220,
    borderRadius: radius.full,
    backgroundColor: "rgba(234, 111, 63, 0.07)",
  },
  backgroundOrbRight: {
    position: "absolute",
    bottom: 120,
    right: -150,
    width: 240,
    height: 240,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 204, 156, 0.05)",
  },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    gap: spacing[3],
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28,
    gap: spacing[3] + 2,
  },
  heroCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelStrong,
    padding: 18,
    gap: spacing[3],
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -64,
    right: -48,
    width: 180,
    height: 180,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 183, 132, 0.08)",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    ...brandShadow,
  },
  brandMarkText: {
    color: "#170c0a",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  brandCopy: {
    flex: 1,
    gap: spacing[1],
  },
  eyebrow: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: colors.textSoft,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.3,
    textTransform: "uppercase",
    overflow: "hidden",
  },
  brandName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 33,
    letterSpacing: -0.5,
    fontFamily: displayFontFamily,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 560,
  },
  heroSignalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  heroSignalChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  heroSignalText: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "600",
  },
  handoffCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.successBorder,
    backgroundColor: colors.successBackground,
    padding: 16,
    gap: spacing[2],
  },
  handoffEyebrow: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  handoffTitle: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: "700",
  },
  handoffBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  stepGrid: {
    gap: spacing[3],
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 16,
    gap: spacing[3],
    ...panelShadow,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 24,
    letterSpacing: -0.2,
    fontFamily: displayFontFamily,
  },
  sectionBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  fieldBlock: {
    gap: 7,
  },
  checkboxCard: {
    flexDirection: "row",
    gap: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBackground,
    padding: 14,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxBoxChecked: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.brandSoft,
  },
  checkboxMark: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  checkboxCopy: {
    flex: 1,
    gap: spacing[1],
  },
  ageGateCard: {
    flexDirection: "row",
    gap: spacing[3],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBackground,
    padding: 14,
  },
  ageGateCardActive: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.brandSoft,
  },
  ageGateBadge: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.brandMuted,
  },
  ageGateBadgeText: {
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: "800",
  },
  ageGateHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing[2],
  },
  label: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  inlineLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  inlineAction: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.inputBackground,
    color: colors.textPrimary,
    fontSize: 16,
  },
  composerInput: {
    minHeight: 108,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: colors.errorBorder,
  },
  helper: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  errorText: {
    color: colors.errorText,
    fontSize: 13,
    lineHeight: 18,
  },
  infoCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: spacing[2] - 1,
  },
  infoTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  infoBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  inviteReviewCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.brandSoft,
    padding: 14,
    gap: spacing[2] - 1,
  },
  inviteRevealCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: spacing[2],
  },
  onboardingStepRow: {
    flexDirection: "row",
    gap: spacing[2],
  },
  onboardingStep: {
    flex: 1,
    minHeight: 58,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: spacing[1],
  },
  onboardingStepActive: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.brandSoft,
  },
  onboardingStepNumber: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "800",
  },
  onboardingStepLabel: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
    paddingHorizontal: 16,
    ...brandShadow,
  },
  primaryButtonPressed: {
    opacity: 0.96,
    backgroundColor: colors.brandPressed,
    transform: [{ translateY: 1 }],
  },
  primaryButtonDisabled: {
    opacity: 0.48,
  },
  primaryButtonLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  secondaryButtonPressed: {
    opacity: 0.92,
    transform: [{ translateY: 1 }],
  },
  secondaryButtonLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  tertiaryButton: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  tertiaryButtonLabel: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  devButton: {
    marginTop: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  devButtonLabel: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  bullet: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[3],
  },
  metricCard: {
    flex: 1,
    minWidth: 150,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: spacing[1] + 2,
  },
  sessionList: {
    gap: 10,
  },
  sessionRow: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: spacing[1] + 2,
  },
  sessionRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  sessionRowTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  sessionCurrentBadge: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sessionCurrentBadgeLabel: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  sessionRowMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  deviceLinkCard: {
    gap: spacing[3],
  },
  qrScannerCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: spacing[2] + 2,
  },
  qrScannerFrame: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: "#000000",
  },
  qrDisplayCard: {
    alignItems: "center",
    gap: spacing[2] + 2,
  },
  qrDisplaySurface: {
    borderRadius: radius.xl,
    backgroundColor: "#ffffff",
    padding: spacing[4],
  },
  deviceLinkStatusCard: {
    gap: spacing[2] + 2,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  metricValue: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
  metricValueText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  segmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  segmentButton: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  segmentButtonActive: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.brandSoft,
  },
  segmentButtonLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  segmentButtonLabelActive: {
    color: colors.textSoft,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  buttonRowButton: {
    flex: 1,
    minWidth: 150,
  },
  codeText: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  diagnosticsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[3],
  },
  diagnosticsToggleLabel: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "800",
  },
  disclosureHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing[3],
  },
  disclosureBody: {
    gap: spacing[2],
  },
  inlineLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  groupSelectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  groupSelectorChip: {
    minWidth: 132,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  groupSelectorChipActive: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.brandSoft,
  },
  groupSelectorLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  groupSelectorLabelActive: {
    color: colors.textSoft,
  },
  groupSelectorMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  threadMetaRow: {
    gap: 4,
  },
  threadMetaText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  threadList: {
    gap: 10,
  },
  messageRow: {
    flexDirection: "row",
  },
  messageRowOwn: {
    justifyContent: "flex-end",
  },
  messageBubble: {
    maxWidth: "88%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 6,
  },
  messageBubbleOwn: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.brandSoft,
  },
  skeletonBubble: {
    maxWidth: "75%",
    height: 60,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  skeletonBubbleSoft: {
    opacity: 0.6,
    width: "60%",
  },
  skeletonBubbleFaint: {
    opacity: 0.3,
    width: "40%",
  },
  emptyThreadCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 6,
  },
  pendingAttachmentCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 10,
  },
  pendingAttachmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  pendingAttachmentImage: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    backgroundColor: colors.inputBackground,
  },
  resumeCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.brandMuted,
    padding: 14,
    gap: 8,
  },
  resumeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  resumeEyebrow: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  resumeTimestamp: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  resumeTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
  },
  resumePreview: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  resumeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  resumeAction: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  resumeEmptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 14,
    gap: 8,
  },
  resumeEmptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  resumeEmptyBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  searchInput: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: colors.textPrimary,
    fontSize: 15,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.brandSoft,
  },
  filterLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  filterLabelActive: {
    color: colors.textSoft,
  },
  emptyState: {
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 16,
  },
  emptyStateTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  emptyStateBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },

  // ---- image viewer ----

  // ---- message context menu ----

  // ---- format toolbar ----
  editModeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editModeBannerText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "600",
  },
  replyComposerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  replyComposerAccent: {
    width: 3,
    alignSelf: "stretch",
    borderRadius: 2,
    backgroundColor: colors.brand,
  },
  replyComposerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  replyComposerTitle: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "800",
  },
  replyComposerText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },

  // ---- group settings modal ----
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.panelStrong,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: 20,
    paddingBottom: 36,
    gap: 16,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  inviteLinkBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBackground,
    padding: 12,
    gap: 6,
  },

  // ---- profile avatar ----
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarInitials: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  editedLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: "italic",
  },
  sentTick: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand,
    marginLeft: "auto" as unknown as number,
    alignSelf: "center",
  },

  // ---- swipeable chat row ----

  // ---- conversation top bar ----
  attachmentRetryButton: {
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
  attachmentRetryLabel: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },

  // ---- date separator ----

  // ---- docked composer ----
  // Telegram-style icon buttons

  // ---- member roster modal ----

  // ---- member profile sheet ----

  // ---- role badge ----

  // ---- member activity section ----

  // ---- member notes section ----

  // ---- member profile action buttons ----

  // ---- attach menu sheet ----

  // ---- attach sub-sheets (location / poll / checklist) ----

  // duration chips (live location)

  // poll / checklist option rows
  textInput: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: 6,
  },
  disabledButton: {
    opacity: 0.45,
  },
});
