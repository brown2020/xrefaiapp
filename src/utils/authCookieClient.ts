import { useAuthStore } from "@/zustand/useAuthStore";

export async function persistIdTokenCookie(idToken: string): Promise<boolean> {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ idToken }),
  });
  if (response.ok) useAuthStore.getState().setAuthDetails({ sessionReady: true });
  return response.ok;
}

export async function clearAuthCookie(): Promise<void> {
  useAuthStore.getState().setAuthDetails({ sessionReady: false, sessionRecheckRequested: false });
  // keepalive: useAuthToken fires this without waiting when Firebase reports
  // no user, and leaving the page must not cancel it. A cookie left behind
  // would keep /login redirecting a client that is signed out.
  await fetch("/api/auth/session", {
    method: "DELETE",
    credentials: "include",
    keepalive: true,
  });
}
