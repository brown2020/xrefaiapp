/** v4 signed URLs cannot last longer than 7 days. Stay a minute under that cap. */
export const IMAGE_READ_URL_TTL_MS = 7 * 24 * 60 * 60 * 1000 - 60_000;

/**
 * Storage object path for one generated image owned by `uid`.
 * Rejects other users' prefixes and any nested or escaped path.
 */
export function ownedGeneratedPath(uid: string, value: unknown): string | null {
  if (typeof uid !== "string" || !uid || uid.includes("/") || uid.includes("\\")) {
    return null;
  }
  if (typeof value !== "string") return null;
  const path = value.trim();
  const prefix = `generated/${uid}/`;
  if (!path.startsWith(prefix) || path.length > 512) return null;
  if (path.includes("..") || path.includes("\\") || path.includes("//")) return null;
  const fileName = path.slice(prefix.length);
  if (!fileName || !/^[A-Za-z0-9._-]+$/.test(fileName)) return null;
  return path;
}

/**
 * Path to delete when a history row goes away.
 * Prefers the stored path, then a generated-object path embedded in a signed URL.
 */
export function storagePathFromHistoryFields(
  uid: string,
  fields: { storagePath?: unknown; response?: unknown }
): string | null {
  const explicit = ownedGeneratedPath(uid, fields.storagePath);
  if (explicit) return explicit;
  if (typeof fields.response !== "string" || !fields.response) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(fields.response);
  } catch {
    decoded = fields.response;
  }
  const marker = `generated/${uid}/`;
  const index = decoded.indexOf(marker);
  if (index === -1) return null;
  const path = decoded.slice(index).split(/[?\s#]/)[0];
  return ownedGeneratedPath(uid, path);
}
