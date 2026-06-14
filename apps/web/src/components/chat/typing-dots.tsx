/**
 * Animated typing indicator — three dots looping a staggered bounce, replacing
 * the plain "is typing" text banner. Web port of the mobile TypingDots. The
 * bounce collapses to static under prefers-reduced-motion (see globals.css).
 */
export function TypingDots() {
  return (
    <span className="ec-typing" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="ec-typing-dot"
          style={{ animationDelay: `${index * 0.14}s` }}
        />
      ))}
    </span>
  );
}
