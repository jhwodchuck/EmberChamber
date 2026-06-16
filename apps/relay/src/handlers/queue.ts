import { runRelayCleanup } from "../services/cleanup";
import { deliverMagicLinkEmail } from "../services/email";
import { deliverAllPushWake } from "../services/push";
import type { Env, RelayQueueMessage } from "../types";

export async function consumeQueue(
  batch: MessageBatch<RelayQueueMessage>,
  env: Env,
): Promise<void> {
  for (const message of batch.messages) {
    try {
      if (message.body.type === "cleanup_pulse") {
        await runRelayCleanup(env);
      } else if (message.body.type === "magic_link") {
        await deliverMagicLinkEmail(env, message.body);
      } else if (message.body.type === "push_wake") {
        await deliverAllPushWake(env, message.body);
      }
      message.ack();
    } catch (error) {
      console.error("relay_queue_error", {
        queue: batch.queue,
        type: (message.body as { type?: string }).type,
        error: error instanceof Error ? error.message : String(error),
      });
      message.retry();
    }
  }
}
