/**
 * EmberChamber design-system React primitives (web / DOM only).
 *
 * These are inline-style components that rely on the canonical design-system
 * CSS custom properties (--ember-*, --font-sans, --radius-*, --brand-soft, …)
 * being defined globally — see apps/web/src/app/globals.css. They render to the
 * DOM and are NOT compatible with React Native; mobile consumes
 * `@emberchamber/ui/tokens` instead. Import via `@emberchamber/ui/components`.
 */

export { Avatar, type AvatarProps } from "./core/Avatar";
export { Badge, type BadgeProps } from "./core/Badge";
export { Button, type ButtonProps } from "./core/Button";
export { Card, type CardProps } from "./core/Card";
export { Chip, type ChipProps } from "./core/Chip";
export { Eyebrow, type EyebrowProps } from "./core/Eyebrow";
export { IconButton, type IconButtonProps } from "./core/IconButton";
export { StatusCallout, type StatusCalloutProps } from "./core/StatusCallout";
export { TrustBadge, type TrustBadgeProps } from "./core/TrustBadge";

export { Checkbox, type CheckboxProps } from "./forms/Checkbox";
export { Input, type InputProps } from "./forms/Input";
export { Select, type SelectProps } from "./forms/Select";
export { Switch, type SwitchProps } from "./forms/Switch";
export { Textarea, type TextareaProps } from "./forms/Textarea";

export { SidebarItem, type SidebarItemProps } from "./navigation/SidebarItem";
export { Tabs, type TabsProps } from "./navigation/Tabs";

export { ConversationRow, type ConversationRowProps } from "./messaging/ConversationRow";
export { MessageBubble, type MessageBubbleProps } from "./messaging/MessageBubble";
