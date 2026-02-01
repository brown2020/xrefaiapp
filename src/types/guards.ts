/**
 * Type guard utilities for runtime type checking.
 * These help ensure type safety when dealing with unknown data from APIs or Firestore.
 */

/**
 * Type guard to check if a value is a non-null object.
 *
 * @param value - The value to check
 * @returns True if value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if a value is a string.
 *
 * @param value - The value to check
 * @returns True if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Type guard to check if a value is a number (and finite).
 *
 * @param value - The value to check
 * @returns True if value is a finite number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Type guard to check if a value is a boolean.
 *
 * @param value - The value to check
 * @returns True if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/**
 * Type guard to check if a value is an array.
 *
 * @param value - The value to check
 * @returns True if value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Type guard to check if an object has a specific property.
 *
 * @param obj - The object to check
 * @param key - The property key to check for
 * @returns True if the object has the property
 */
export function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

/**
 * Type guard to check if an object has a string property.
 *
 * @param obj - The object to check
 * @param key - The property key to check for
 * @returns True if the object has the property and it's a string
 */
export function hasStringProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, string> {
  return hasProperty(obj, key) && isString(obj[key]);
}

/**
 * Type guard to check if an object has a number property.
 *
 * @param obj - The object to check
 * @param key - The property key to check for
 * @returns True if the object has the property and it's a number
 */
export function hasNumberProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, number> {
  return hasProperty(obj, key) && isNumber(obj[key]);
}

/**
 * Type guard to check if a value is a Firestore Timestamp-like object.
 *
 * @param value - The value to check
 * @returns True if value has seconds and toDate method
 */
export function isTimestampLike(
  value: unknown
): value is { seconds: number; toDate: () => Date } {
  return (
    isObject(value) &&
    hasNumberProperty(value, "seconds") &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  );
}

/**
 * Safely extracts a string from an unknown value.
 *
 * @param value - The value to extract from
 * @param fallback - Fallback value if extraction fails
 * @returns The extracted string or fallback
 */
export function safeString(value: unknown, fallback: string = ""): string {
  return isString(value) ? value : fallback;
}

/**
 * Safely extracts a number from an unknown value.
 *
 * @param value - The value to extract from
 * @param fallback - Fallback value if extraction fails
 * @returns The extracted number or fallback
 */
export function safeNumber(value: unknown, fallback: number = 0): number {
  if (isNumber(value)) return value;
  if (isString(value)) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/**
 * Safely extracts a boolean from an unknown value.
 *
 * @param value - The value to extract from
 * @param fallback - Fallback value if extraction fails
 * @returns The extracted boolean or fallback
 */
export function safeBoolean(value: unknown, fallback: boolean = false): boolean {
  return isBoolean(value) ? value : fallback;
}

/**
 * Creates a type guard for checking if a value is one of the specified string literals.
 *
 * @param validValues - Array of valid string values
 * @returns A type guard function
 *
 * @example
 * const isRole = createStringLiteralGuard(['user', 'assistant', 'system']);
 * if (isRole(value)) {
 *   // value is typed as 'user' | 'assistant' | 'system'
 * }
 */
export function createStringLiteralGuard<T extends string>(
  validValues: readonly T[]
): (value: unknown) => value is T {
  const validSet = new Set<string>(validValues);
  return (value: unknown): value is T => isString(value) && validSet.has(value);
}

/**
 * Asserts that a condition is true, throwing an error if not.
 * Useful for narrowing types in code paths where a condition must be met.
 *
 * @param condition - The condition to assert
 * @param message - Error message if assertion fails
 */
export function assert(condition: unknown, message: string = "Assertion failed"): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Asserts that a value is defined (not null or undefined).
 *
 * @param value - The value to check
 * @param message - Error message if assertion fails
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message: string = "Value is null or undefined"
): asserts value is T {
  assert(value !== null && value !== undefined, message);
}
