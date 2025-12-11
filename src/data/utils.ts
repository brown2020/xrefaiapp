import { SelectOption } from "@/types/common";

/**
 * Helper to create select options from a simple array of strings
 * Use this when value === label
 */
export function createSimpleOptions(items: string[]): SelectOption[] {
  return items.map((item) => ({ value: item, label: item }));
}

/**
 * Helper to create select options with custom values
 * Use this when value !== label (e.g., painters with full descriptions)
 */
export function createOptions(
  items: Array<{ label: string; value: string }>
): SelectOption[] {
  return items;
}
