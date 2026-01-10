/**
 * Tiny className join helper (avoids adding a dependency).
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

