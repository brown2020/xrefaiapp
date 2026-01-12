"use client";

import { useSearchParams } from "next/navigation";
import { getCreditPack } from "@/constants/creditPacks";
import { ROUTES } from "@/constants/routes";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { auth } from "@/firebase/firebaseClient";
import { getIdToken } from "firebase/auth";

export default function PaymentAttempt() {
  const searchParams = useSearchParams();
  const packId = searchParams.get("pack");
  const redirect = searchParams.get("redirect") || ROUTES.account;
  const pack = getCreditPack(packId);
  const [error, setError] = useState<string | null>(null);

  const payload = useMemo(
    () => ({ packId: pack.id, redirectPath: redirect }),
    [pack.id, redirect]
  );

  useEffect(() => {
    let isCancelled = false;

    const run = async () => {
      setError(null);
      try {
        const idToken = auth.currentUser
          ? await getIdToken(auth.currentUser, true)
          : "";

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (idToken) headers.Authorization = `Bearer ${idToken}`;

        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify(payload),
        });
        const json = (await res.json().catch(() => null)) as
          | { url?: string; error?: string }
          | null;

        if (!json) throw new Error("Invalid response from billing service");
        if (!res.ok) throw new Error(json.error || "Failed to start checkout");
        if (!json.url) throw new Error("Missing checkout URL");

        if (!isCancelled) {
          window.location.href = json.url;
        }
      } catch (e) {
        if (isCancelled) return;
        setError(e instanceof Error ? e.message : "Could not start checkout");
      }
    };

    void run();
    return () => {
      isCancelled = true;
    };
  }, [payload]);

  if (error) {
    return (
      <main className="min-h-full flex items-center justify-center px-4 py-10 bg-muted/30">
        <div className="w-full max-w-lg bg-card text-card-foreground border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border">
            <h1 className="text-xl font-bold text-foreground">Checkout not started</h1>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <div className="p-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Link
              href={ROUTES.account}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-card text-foreground rounded-xl border border-border hover:opacity-90 transition-opacity"
            >
              Back to account
            </Link>
            <Link
              href={`${ROUTES.paymentAttempt}?pack=${encodeURIComponent(
                pack.id
              )}&redirect=${encodeURIComponent(redirect)}`}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
            >
              Try again
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-muted/30">
      <LoadingSpinner size="lg" text="Redirecting to secure checkout..." />
    </div>
  );
}
