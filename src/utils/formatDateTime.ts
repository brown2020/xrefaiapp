const localDateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Formats in the viewer's time zone. Call only from client-rendered data. */
export function formatDateTime(epochMs: number): string {
  return localDateTime.format(epochMs);
}
