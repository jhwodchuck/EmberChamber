import { clsx } from "clsx";

export function Avatar({
  src,
  name,
  size = "md",
}: {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={clsx(sizeClasses[size], "rounded-full object-cover flex-shrink-0")}
      />
    );
  }

  return (
    <div
      className={clsx(
        sizeClasses[size],
        "rounded-full bg-brand-500/15 text-brand-500 flex items-center justify-center font-semibold flex-shrink-0"
      )}
    >
      {initials}
    </div>
  );
}
