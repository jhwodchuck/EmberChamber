const utcDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const utcDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

export function formatUtcDate(value: string | number | Date) {
  return utcDateFormatter.format(new Date(value));
}

export function formatUtcDateTime(value: string | number | Date) {
  return utcDateTimeFormatter.format(new Date(value));
}
