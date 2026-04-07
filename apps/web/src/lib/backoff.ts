/**
 * Exponential backoff with jitter for WebSocket reconnect scheduling.
 *
 * The delay grows as  min(maxMs, baseMs × 2^attempt) with up to ±jitterFactor
 * fractional jitter added on top so that a fleet of clients with identical
 * failure timings does not all hammer the relay at the same instant.
 *
 * Usage:
 *   const attemptRef = useRef(0);
 *   // on open:  attemptRef.current = 0;
 *   // on close: delay = calcReconnectDelayMs(attemptRef.current++);
 *               setTimeout(reconnect, delay);
 */
export function calcReconnectDelayMs(
  attempt: number,
  baseMs = 1_500,
  maxMs = 30_000,
  jitterFactor = 0.3,
): number {
  const capped = Math.min(maxMs, baseMs * Math.pow(2, attempt));
  const jitter = capped * jitterFactor * (Math.random() * 2 - 1); // ±jitterFactor
  return Math.max(0, Math.round(capped + jitter));
}
