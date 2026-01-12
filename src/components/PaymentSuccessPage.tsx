"use client";

import useProfileStore from "@/zustand/useProfileStore";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { auth } from "@/firebase/firebaseClient";
import { getIdToken } from "firebase/auth";

type ConfirmResponse =
  | {
      ok: true;
      alreadyProcessed: boolean;
      creditsAdded: number;
      creditsBalance: number;
      pack: { id: string; name: string; usdCents: number };
    }
  | { error: string; paymentStatus?: string };

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function PaymentSuccessPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ConfirmResponse | null>(null);

  const searchParams = useSearchParams();
  const redirectPath = useMemo(
    () => searchParams.get("redirect") || ROUTES.account,
    [searchParams]
  );
  const sessionId = useMemo(
    () => searchParams.get("session_id") || "",
    [searchParams]
  );

  const fetchProfile = useProfileStore((state) => state.fetchProfile);

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      try {
        setData(null);
        if (!sessionId) {
          setData({ error: "Missing session_id" });
          return;
        }

        const idToken = auth.currentUser ? await getIdToken(auth.currentUser, true) : "";
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (idToken) headers.Authorization = `Bearer ${idToken}`;

        const res = await fetch("/api/billing/confirm", {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({ sessionId }),
        });
        const json = (await res.json().catch(() => null)) as
          | ConfirmResponse
          | null;
        if (!json) throw new Error("Invalid response");
        setData(json);

        // Refresh local credits balance from Firestore after server fulfillment.
        if (res.ok && "ok" in json && json.ok) {
          await fetchProfile();
        }
      } catch (error) {
        setData({
          error: error instanceof Error ? error.message : "Error handling payment success.",
        });
      } finally {
        setLoading(false);
      }
    };

    void handlePaymentSuccess();
  }, [fetchProfile, sessionId]);

  const isOk = data && "ok" in data && data.ok;

  return (
    <main className="min-h-full flex items-center justify-center px-4 py-10 bg-muted/30">
      <div className="w-full max-w-lg bg-card text-card-foreground border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          {loading ? (
            <div className="py-8">
              <LoadingSpinner size="lg" text="Validating your payment..." />
            </div>
          ) : !isOk ? (
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Purchase not confirmed
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {"error" in (data ?? {}) ? (data as { error: string }).error : "Unknown error"}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {data.alreadyProcessed ? "Already credited" : "Credits added"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Your credits are now available.
                </p>
              </div>
            </div>
          )}
        </div>

        {!loading && isOk ? (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow
                label="Pack"
                value={`${data.pack.name} (${formatUsd(data.pack.usdCents)})`}
              />
              <InfoRow label="Credits added" value={data.creditsAdded.toLocaleString()} />
              <InfoRow
                label="Balance"
                value={data.creditsBalance.toLocaleString()}
              />
              <InfoRow label="Status" value={data.alreadyProcessed ? "Already processed" : "Processed"} />
            </div>
          </div>
        ) : null}

        <div className="p-6 border-t border-border flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Link
            href={redirectPath}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href={ROUTES.chat}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-card text-foreground rounded-xl border border-border hover:opacity-90 transition-opacity"
          >
            Go to chat
          </Link>
        </div>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 border border-border rounded-xl p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground mt-0.5">{value}</div>
    </div>
  );
}
