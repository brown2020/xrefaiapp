import "server-only";

import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { requireAuthedPageUid } from "@/actions/serverAuth";

/**
 * Page-level auth gate for Server Components.
 *
 * Uses lenient token verification: if the cookie contains an expired (but
 * otherwise valid) Firebase ID token the page still renders so the client-side
 * token refresh can obtain a fresh token on hydration.
 */
export async function requireAuthedPage(): Promise<string> {
  try {
    return await requireAuthedPageUid();
  } catch {
    redirect(ROUTES.home);
  }
}
