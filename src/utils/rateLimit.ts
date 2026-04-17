import { adminDb, admin } from "@/firebase/firebaseAdmin";

/**
 * Rate limit configuration for different endpoints
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

/**
 * Default rate limit configurations for different endpoints
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  chat: { maxRequests: 60, windowMs: 60_000 },
  image: { maxRequests: 10, windowMs: 60_000 },
  tools: { maxRequests: 30, windowMs: 60_000 },
  default: { maxRequests: 100, windowMs: 60_000 },
};

/**
 * Result of a rate limit check
 */
export interface RateLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  resetMs: number;
  remaining: number;
}

type RateLimitDoc = {
  /** Window start timestamp (ms since epoch). */
  windowStart?: number;
  /** Number of requests served in the current window. */
  count?: number;
};

/**
 * Checks and updates rate limit for a user on a specific endpoint.
 * Uses a Firestore transaction with a fixed-window counter: a single integer
 * counter plus a window-start timestamp. This avoids the unbounded-array
 * growth and duplicate-timestamp-on-retry issues of the previous design.
 *
 * @param uid - The user's unique identifier
 * @param endpoint - The endpoint being rate limited (e.g., "chat", "image")
 * @param config - Optional custom rate limit configuration
 * @returns RateLimitResult indicating if the request is allowed
 */
export async function checkRateLimit(
  uid: string,
  endpoint: string,
  config?: RateLimitConfig
): Promise<RateLimitResult> {
  const { maxRequests, windowMs } =
    config || RATE_LIMITS[endpoint] || RATE_LIMITS.default;
  const now = Date.now();

  const rateLimitRef = adminDb.doc(`users/${uid}/rateLimit/${endpoint}`);

  try {
    return await adminDb.runTransaction(
      async (tx: FirebaseFirestore.Transaction): Promise<RateLimitResult> => {
        const snap = await tx.get(rateLimitRef);
        const data = snap.exists ? (snap.data() as RateLimitDoc) : null;

        const windowStart =
          typeof data?.windowStart === "number" &&
          Number.isFinite(data.windowStart) &&
          now - data.windowStart < windowMs
            ? data.windowStart
            : now;

        const currentCount =
          typeof data?.count === "number" &&
          Number.isFinite(data.count) &&
          windowStart === data?.windowStart
            ? Math.max(0, Math.floor(data.count))
            : 0;

        if (currentCount >= maxRequests) {
          const resetMs = Math.max(0, windowStart + windowMs - now);
          return {
            allowed: false,
            current: currentCount,
            limit: maxRequests,
            resetMs,
            remaining: 0,
          };
        }

        const nextCount = currentCount + 1;
        tx.set(rateLimitRef, {
          windowStart,
          count: nextCount,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
          allowed: true,
          current: nextCount,
          limit: maxRequests,
          resetMs: Math.max(0, windowStart + windowMs - now),
          remaining: Math.max(0, maxRequests - nextCount),
        };
      }
    );
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Fail open to avoid turning infra hiccups into outages.
    return {
      allowed: true,
      current: 0,
      limit: maxRequests,
      resetMs: windowMs,
      remaining: maxRequests,
    };
  }
}

/**
 * Creates a rate limit error response with appropriate headers.
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  const retryAfterSeconds = Math.max(1, Math.ceil(result.resetMs / 1000));

  return Response.json(
    {
      error: "Too many requests",
      message: `Rate limit exceeded. Please try again in ${retryAfterSeconds} seconds.`,
      retryAfter: retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(
          Math.ceil((Date.now() + result.resetMs) / 1000)
        ),
      },
    }
  );
}

/**
 * Middleware-style rate limiter that can be used in API routes.
 * Returns null if the request is allowed, or a Response if rate limited.
 */
export async function rateLimitMiddleware(
  uid: string,
  endpoint: string,
  config?: RateLimitConfig
): Promise<Response | null> {
  const result = await checkRateLimit(uid, endpoint, config);
  if (!result.allowed) return createRateLimitResponse(result);
  return null;
}

/**
 * Cleanup function to remove stale rate limit docs.
 * Safe to call periodically.
 */
export async function cleanupRateLimitData(uid: string): Promise<void> {
  const rateLimitCollection = adminDb.collection(`users/${uid}/rateLimit`);
  const snapshot = await rateLimitCollection.get();

  const now = Date.now();
  const maxWindowMs = Math.max(
    ...Object.values(RATE_LIMITS).map((c) => c.windowMs)
  );
  const cutoff = now - maxWindowMs * 2;

  const batch = adminDb.batch();
  let hasUpdates = false;

  snapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
    const data = doc.data() as RateLimitDoc | undefined;
    const windowStart = Number(data?.windowStart ?? 0);
    if (!Number.isFinite(windowStart) || windowStart < cutoff) {
      hasUpdates = true;
      batch.delete(doc.ref);
    }
  });

  if (hasUpdates) {
    await batch.commit();
  }
}
