const stableDateTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function formatStableDateTime(epochMs: number): string {
  return stableDateTime.format(epochMs);
}
