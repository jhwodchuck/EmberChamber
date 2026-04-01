import type { WebSocketEvent } from "@emberchamber/api-types";

/** Minimal transport abstraction — wires up in Sprint 2. */
export interface TransportRouter {
  send(event: WebSocketEvent): Promise<void>;
  subscribe(handler: (event: WebSocketEvent) => void): () => void;
}
