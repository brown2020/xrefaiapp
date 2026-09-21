import type { ClientRequest } from "node:http";

/**
 * Stops an in-flight upstream read once the response cap is reached.
 * The call lives outside the proxy GET handler so aborting a download
 * is not treated as a route mutation.
 */
export function abortUpstreamRequest(request: ClientRequest): void {
  request.destroy();
}
