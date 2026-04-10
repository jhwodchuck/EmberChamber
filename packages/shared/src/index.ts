// Shared types for EmberChamber
export * from "./message-format";

export type UserRole = "owner" | "admin" | "moderator" | "member";
export type ConversationType = "dm" | "group" | "channel";
export type MessageType = "text" | "file" | "image" | "audio" | "system";
export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";
export type ChannelVisibility = "public" | "private";
export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";
export type ReportStatus = "pending" | "reviewed" | "actioned" | "dismissed";
export type ModerationActionType = "warn" | "mute" | "kick" | "ban" | "delete_message" | "suspend_account";

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
  lastSeenAt?: string;
  isOnline?: boolean;
  privacySettings?: UserPrivacySettings;
}

export interface UserPrivacySettings {
  showLastSeen: boolean;
  showReadReceipts: boolean;
  allowDmsFrom: "everyone" | "contacts" | "nobody";
  showOnlineStatus: boolean;
  profileVisible: boolean;
}

export interface Session {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: "web" | "mobile" | "desktop";
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  lastActiveAt: string;
  isCurrent?: boolean;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string;
  description?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: Message;
  unreadCount?: number;
  members?: ConversationMember[];
  isEncrypted?: boolean;
}

export interface ConversationMember {
  userId: string;
  conversationId: string;
  role: UserRole;
  joinedAt: string;
  mutedUntil?: string;
  user?: User;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content?: string;
  encryptedContent?: string;
  attachmentId?: string;
  attachment?: Attachment;
  replyToId?: string;
  replyTo?: Message;
  editedAt?: string;
  deletedAt?: string;
  status?: MessageStatus;
  createdAt: string;
  sender?: User;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  messageId?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  isEncrypted?: boolean;
  createdAt: string;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  visibility: ChannelVisibility;
  ownerId: string;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
  lastPost?: ChannelPost;
}

export interface ChannelPost {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  attachmentId?: string;
  attachment?: Attachment;
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
  author?: User;
  reactionCount?: number;
}

export interface Invite {
  id: string;
  code: string;
  conversationId?: string;
  channelId?: string;
  createdBy: string;
  expiresAt?: string;
  maxUses?: number;
  useCount: number;
  status: InviteStatus;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId?: string;
  reportedMessageId?: string;
  reportedChannelId?: string;
  reason: string;
  details?: string;
  status: ReportStatus;
  createdAt: string;
}

// WebSocket event types
export type WSEventType =
  | "message.new"
  | "message.edited"
  | "message.deleted"
  | "message.reaction"
  | "conversation.updated"
  | "conversation.member.joined"
  | "conversation.member.left"
  | "channel.post.new"
  | "channel.post.edited"
  | "channel.post.deleted"
  | "user.typing"
  | "user.presence"
  | "notification"
  | "error";

export interface WSEvent<T = unknown> {
  type: WSEventType;
  payload: T;
  timestamp: string;
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface PresenceEvent {
  userId: string;
  isOnline: boolean;
  lastSeenAt?: string;
}

// API response wrappers
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}
