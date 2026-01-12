"use client";

import { useAuthStore } from "@/zustand/useAuthStore";
import useProfileStore from "@/zustand/useProfileStore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fulfillStripePaymentIntent } from "@/actions/paymentActions";
import { useSearchParams } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";

type Props = {
  payment_intent: string;
};

export default function PaymentSuccessPage({ payment_intent }: Props) {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isAlreadyProcessed, setIsAlreadyProcessed] = useState(false);

  const [createdMs, setCreatedMs] = useState<number | null>(null);
  const [paymentId, setPaymentId] = useState("");
  const [amountCents, setAmountCents] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [creditsAdded, setCreditsAdded] = useState<number | null>(null);

  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || ROUTES.account;

  const fetchProfile = useProfileStore((state) => state.fetchProfile);

  const uid = useAuthStore((state) => state.uid);

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      try {
        setErrorMessage("");
        setIsAlreadyProcessed(false);

        if (!payment_intent) {
          setErrorMessage("No payment intent found.");
          return;
        }
        if (!uid) {
          setErrorMessage("Please sign in to finish processing your payment.");
          return;
        }

        const result = await fulfillStripePaymentIntent(payment_intent);
        setIsAlreadyProcessed(result.alreadyProcessed);
        setPaymentId(result.id);
        setAmountCents(result.amount);
        setCurrency((result.currency || "USD").toUpperCase());
        setCreatedMs(result.createdMs);
        setCreditsAdded(result.creditsAdded);

        // Refresh local credits balance from Firestore after server fulfillment.
        await fetchProfile();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Error handling payment success."
        );
      } finally {
        setLoading(false);
      }
    };

    void handlePaymentSuccess();
  }, [payment_intent, fetchProfile, uid]);

  const amountDollars = amountCents ? (amountCents / 100).toFixed(2) : null;
  const shortPaymentId = paymentId ? `${paymentId.slice(0, 10)}…` : "";

  return (
    <main className="min-h-full flex items-center justify-center px-4 py-10 bg-muted/30">
      <div className="w-full max-w-lg bg-card text-card-foreground border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          {loading ? (
            <div className="py-8">
              <LoadingSpinner size="lg" text="Validating your payment..." />
            </div>
          ) : errorMessage ? (
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Payment not completed
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {errorMessage}
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
                  {isAlreadyProcessed ? "Payment already processed" : "Payment successful"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Your credits are now available.
                </p>
              </div>
            </div>
          )}
        </div>

        {!loading && !errorMessage && paymentId ? (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow label="Amount" value={amountDollars ? `$${amountDollars}` : "—"} />
              <InfoRow label="Currency" value={currency || "USD"} />
              <InfoRow
                label="Credits added"
                value={creditsAdded !== null ? creditsAdded.toLocaleString() : "—"}
              />
              <InfoRow
                label="Processed at"
                value={createdMs ? new Date(createdMs).toLocaleString() : "—"}
              />
            </div>

            <div className="text-xs text-muted-foreground">
              Reference: {shortPaymentId}
            </div>
          </div>
        ) : null}

        <div className="p-6 border-t border-border flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Link
            href={redirectPath}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
          >
            View account <ArrowRight className="w-4 h-4" />
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
