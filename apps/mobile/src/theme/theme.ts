import { Platform } from "react-native";
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

export const colors = {
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

export const displayFontFamily = Platform.select({
  ios: undefined,
  android: undefined,
  default: undefined,
});

export const panelShadow = {
  ...elevationRoles.panel,
} as const;

export const brandShadow = {
  ...elevationRoles.brand,
} as const;

export const radius = {
  sm: tokenToPx(sharedBorderRadius.sm),
  base: tokenToPx(sharedBorderRadius.base),
  md: tokenToPx(sharedBorderRadius.md),
  lg: tokenToPx(sharedBorderRadius.lg),
  xl: tokenToPx(sharedBorderRadius.xl),
  xxl: tokenToPx(sharedBorderRadius["2xl"]),
  xxxl: tokenToPx(sharedBorderRadius["3xl"]),
  full: tokenToPx(sharedBorderRadius.full),
};

export const spacing = {
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
