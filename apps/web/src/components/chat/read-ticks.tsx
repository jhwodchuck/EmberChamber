import { clsx } from "clsx";

/**
 * Delivery ticks. A first ✓ is always visible; the second ✓ fades + slides in
 * (via the `.ec-tick-second` CSS transition) to settle into ✓✓ once the message
 * has been read by at least one recipient. Web port of the mobile ReadTicks.
 */
export function ReadTicks({ read }: { read: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        lineHeight: 1,
        fontSize: "0.7rem",
      }}
    >
      <span>✓</span>
      <span
        className={clsx("ec-tick-second", read && "is-read")}
        style={{ marginLeft: "-3px" }}
      >
        ✓
      </span>
    </span>
  );
}
