"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthSession, type AuthMode } from "@/components/auth/useAuthSession";
import { AuthCredentialsForm } from "@/components/auth/AuthCredentialsForm";
import { AuthPendingPanel } from "@/components/auth/AuthBits";

/** Full-page sign-in or sign-up. `next` must already be a sanitized internal path. */
export default function AuthPage({ mode, next }: { mode: AuthMode; next: string }) {
  const router = useRouter();
  const session = useAuthSession({
    initialMode: mode,
    onSignedIn: () => router.replace(next),
  });
  const { uid, authEmail, authPending, email, handleSignOut } = session;

  return (
    <main className="min-h-full bg-muted/30 px-5 py-12 md:py-16">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        {uid ? (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold">You&apos;re signed in</h1>
              <p className="mt-1 break-all text-sm text-muted-foreground">{authEmail}</p>
            </div>
            <Link href={next} className="btn-primary mt-0 text-center">
              Continue
            </Link>
            <button type="button" onClick={handleSignOut} className="btn-muted mt-0">
              Sign out
            </button>
          </div>
        ) : authPending ? (
          <AuthPendingPanel email={email} onStartOver={handleSignOut} />
        ) : (
          <AuthCredentialsForm session={session} titleAs="h1" />
        )}
      </div>
    </main>
  );
}
