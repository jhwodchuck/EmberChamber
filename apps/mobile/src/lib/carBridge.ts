/**
 * CarBridge — TypeScript wrapper for the Android Auto native bridge module.
 *
 * Call `updateConversations` and `updateMessages` whenever your app's
 * conversation/message state changes so Android Auto always has fresh
 * data.  Call `consumePendingSends` on resume (or via a periodic timer
 * while the app is backgrounded) to pick up replies the driver dictated
 * in the car.
 *
 * This module is a no-op on iOS and web.
 */
import { NativeModules, Platform } from "react-native";

export interface ConversationSummary {
  id: string;
  title: string;
  lastMessage: string;
}

export interface CarMessage {
  conversationId: string;
  senderName: string;
  body: string;
  timestampMs: number;
}

export interface PendingSend {
  conversationId: string;
  body: string;
}

interface CarBridgeNativeModule {
  updateConversations(conversations: ConversationSummary[]): void;
  updateMessages(messages: CarMessage[]): void;
  consumePendingSends(): Promise<PendingSend[]>;
}

const nativeBridge: CarBridgeNativeModule | null =
  Platform.OS === "android" ? (NativeModules.CarBridge ?? null) : null;

/** Push the current conversation list to Android Auto. */
export function updateCarConversations(
  conversations: ConversationSummary[]
): void {
  nativeBridge?.updateConversations(conversations);
}

/** Push messages for any conversations Android Auto may be displaying. */
export function updateCarMessages(messages: CarMessage[]): void {
  nativeBridge?.updateMessages(messages);
}

/**
 * Returns (and clears) any messages the driver sent via Android Auto.
 * Returns an empty array on non-Android platforms.
 */
export async function consumeCarPendingSends(): Promise<PendingSend[]> {
  if (!nativeBridge) return [];
  return nativeBridge.consumePendingSends();
}
