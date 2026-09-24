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
  useAuthStore.getState().setAuthDetails({ sessionReady: false });
  await fetch("/api/auth/session", {
    method: "DELETE",
    credentials: "include",
  });
}
