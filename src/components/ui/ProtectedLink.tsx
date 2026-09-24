"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useAuthStore } from "@/zustand/useAuthStore";

/**
 * Link to a proxy-protected route. Without the session cookie the proxy
 * answers a prefetch with a redirect home, and Next keeps that cached entry
 * after sign-in, so prefetch stays off until the cookie is written.
 */
export function ProtectedLink(props: ComponentProps<typeof Link>) {
  const sessionReady = useAuthStore((s) => s.sessionReady);
  return <Link {...props} prefetch={sessionReady ? props.prefetch : false} />;
}
