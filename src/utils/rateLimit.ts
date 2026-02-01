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
  chat: { maxRequests: 60, windowMs: 60_000 }, // 60 requests per minute
  image: { maxRequests: 10, windowMs: 60_000 }, // 10 requests per minute
  tools: { maxRequests: 30, windowMs: 60_000 }, // 30 requests per minute
  default: { maxRequests: 100, windowMs: 60_000 }, // 100 requests per minute
};

/**
 * Result of a rate limit check
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current request count in the window */
  current: number;
  /** Maximum allowed requests */
  limit: number;
  /** Milliseconds until the rate limit resets */
  resetMs: number;
  /** Number of remaining requests */
  remaining: number;
}

/**
 * Checks and updates rate limit for a user on a specific endpoint.
 * Uses Firestore for distributed rate limiting across instances.
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
  const { maxRequests, windowMs } = config || RATE_LIMITS[endpoint] || RATE_LIMITS.default;
  const now = Date.now();
  const windowStart = now - windowMs;

  const rateLimitRef = adminDb.doc(`users/${uid}/rateLimit/${endpoint}`);

  try {
    const result = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(rateLimitRef);
      const data = snap.exists ? snap.data() : null;

      // Get existing requests within the current window
      const requests: number[] = data?.requests || [];
      const windowRequests = requests.filter((timestamp) => timestamp > windowStart);

      // Check if limit exceeded
      if (windowRequests.length >= maxRequests) {
        // Find the oldest request in the window to calculate reset time
        const oldestRequest = Math.min(...windowRequests);
        const resetMs = oldestRequest + windowMs - now;

        return {
          allowed: false,
          current: windowRequests.length,
          limit: maxRequests,
          resetMs: Math.max(0, resetMs),
          remaining: 0,
        };
      }

      // Add current request timestamp
      windowRequests.push(now);

      // Update Firestore with cleaned-up request list
      tx.set(rateLimitRef, {
        requests: windowRequests,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        allowed: true,
        current: windowRequests.length,
        limit: maxRequests,
        resetMs: windowMs,
        remaining: maxRequests - windowRequests.length,
      };
    });

    return result;
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // On error, allow the request but log the issue
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
 *
 * @param result - The rate limit result
 * @returns A Response object with 429 status and rate limit headers
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  const retryAfterSeconds = Math.ceil(result.resetMs / 1000);

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
        "X-RateLimit-Reset": String(Math.ceil((Date.now() + result.resetMs) / 1000)),
      },
    }
  );
}

/**
 * Middleware-style rate limiter that can be used in API routes.
 * Returns null if the request is allowed, or a Response if rate limited.
 *
 * @param uid - The user's unique identifier
 * @param endpoint - The endpoint being rate limited
 * @param config - Optional custom rate limit configuration
 * @returns null if allowed, Response if rate limited
 */
export async function rateLimitMiddleware(
  uid: string,
  endpoint: string,
  config?: RateLimitConfig
): Promise<Response | null> {
  const result = await checkRateLimit(uid, endpoint, config);

  if (!result.allowed) {
    return createRateLimitResponse(result);
  }

  return null;
}

/**
 * Cleanup function to remove old rate limit data.
 * This can be run periodically as a cron job or cloud function.
 *
 * @param uid - The user's unique identifier
 */
export async function cleanupRateLimitData(uid: string): Promise<void> {
  const rateLimitCollection = adminDb.collection(`users/${uid}/rateLimit`);
  const snapshot = await rateLimitCollection.get();

  const now = Date.now();
  const maxWindowMs = Math.max(...Object.values(RATE_LIMITS).map((c) => c.windowMs));
  const cutoff = now - maxWindowMs * 2; // Keep 2x the max window for safety

  const batch = adminDb.batch();
  let hasUpdates = false;

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const requests: number[] = data?.requests || [];
    const validRequests = requests.filter((timestamp) => timestamp > cutoff);

    if (validRequests.length < requests.length) {
      hasUpdates = true;
      if (validRequests.length === 0) {
        batch.delete(doc.ref);
      } else {
        batch.update(doc.ref, { requests: validRequests });
      }
    }
  });

  if (hasUpdates) {
    await batch.commit();
  }
}
