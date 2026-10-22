"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebaseClient";
import { useAuthStore } from "@/zustand/useAuthStore";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { coerceCredits } from "@/utils/credits";
import { formatDateTime } from "@/utils/formatDateTime";

type CreditsLedgerEntryType = "debit" | "credit";

type CreditsLedgerEntry = {
  id: string;
  type: CreditsLedgerEntryType;
  amount: number;
  reason: string;
  tool: string | null;
  modelKey: string | null;
  refId: string | null;
  balanceAfter: number | null;
  createdAt: Timestamp | null;
};

function formatDate(ts: Timestamp | null): string {
  if (!ts) return "Pending…";
  return formatDateTime(ts.toMillis());
}

const creditsFormatter = new Intl.NumberFormat();

export default function CreditsLedger() {
  const uid = useAuthStore((s) => s.uid);
  const [entries, setEntries] = useState<CreditsLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const q = useMemo(() => {
    if (!uid) return null;
    return query(
      collection(db, "users", uid, "creditsLedger"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
  }, [uid]);

  useEffect(() => {
    if (!q) {
      setEntries([]);
      setLoading(false);
      setErrorMessage(null);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((doc) => {
          const d = doc.data() as Record<string, unknown>;
          return {
            id: doc.id,
            type: (d.type as CreditsLedgerEntryType) ?? "debit",
            amount: coerceCredits(d.amount, 0),
            reason: (d.reason as string) ?? "",
            tool: (d.tool as string) ?? null,
            modelKey: (d.modelKey as string) ?? null,
            refId: (d.refId as string) ?? null,
            balanceAfter:
              typeof d.balanceAfter === "number" && Number.isFinite(d.balanceAfter)
                ? d.balanceAfter
                : null,
            createdAt: (d.createdAt as Timestamp) ?? null,
          } satisfies CreditsLedgerEntry;
        });
        setEntries(next);
        setLoading(false);
      },
      (err) => {
        console.error("Credits ledger subscribe error:", err);
        setErrorMessage(err.message || "Failed to load credits ledger");
        setEntries([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [q]);

  if (!uid) return null;

  return (
    <section aria-labelledby="ledger-heading">
      <h2 id="ledger-heading" className="mb-3 text-lg font-bold text-foreground">
        Credits ledger
      </h2>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner size="lg" text="Loading credits ledger…" />
          </div>
        ) : errorMessage ? (
          <div className="p-4 bg-destructive/5 text-destructive">
            Could not load the ledger: {errorMessage}
          </div>
        ) : entries.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No credit activity yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">When</th>
                  <th className="text-left font-semibold px-4 py-3">Type</th>
                  <th className="text-right font-semibold px-4 py-3">Amount</th>
                  <th className="text-left font-semibold px-4 py-3">Reason</th>
                  <th className="text-left font-semibold px-4 py-3">Tool</th>
                  <th className="text-left font-semibold px-4 py-3">Model</th>
                  <th className="text-left font-semibold px-4 py-3">Ref</th>
                  <th className="text-right font-semibold px-4 py-3">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((e) => {
                  const isDebit = e.type === "debit";
                  return (
                    <tr key={e.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 whitespace-nowrap text-foreground">
                        {formatDate(e.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                            isDebit
                              ? "bg-red-50 text-red-700"
                              : "bg-green-50 text-green-700"
                          }`}
                        >
                          {isDebit ? "Debit" : "Credit"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {isDebit ? "−" : "+"}
                        {creditsFormatter.format(Math.abs(e.amount))}
                      </td>
                      <td className="px-4 py-3 text-foreground">{e.reason}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.tool ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {e.modelKey ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {e.refId ? `${e.refId.slice(0, 14)}…` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground tabular-nums">
                        {typeof e.balanceAfter === "number"
                          ? creditsFormatter.format(Math.round(e.balanceAfter))
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
