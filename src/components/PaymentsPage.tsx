"use client";

import { useAuthStore } from "@/zustand/useAuthStore";
import { usePaymentsStore, PaymentType } from "@/zustand/usePaymentsStore";
import { useEffect } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CreditCard, Calendar, DollarSign, CheckCircle } from "lucide-react";
import { formatDateTime } from "@/utils/formatDateTime";

export default function PaymentsPage() {
  const uid = useAuthStore((state) => state.uid);
  const { payments, paymentsLoading, paymentsError, fetchPayments } =
    usePaymentsStore();

  useEffect(() => {
    if (uid) {
      fetchPayments();
    }
  }, [uid, fetchPayments]);

  return (
    <section aria-labelledby="payments-heading" className="flex flex-col gap-3">
      <h2 id="payments-heading" className="text-lg font-bold text-foreground">
        Payments
      </h2>

      {paymentsLoading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" text="Loading payments…" />
        </div>
      )}

      {paymentsError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
          Could not load payments: {paymentsError}
        </div>
      )}

      {!paymentsLoading && !paymentsError && (
        <div className="flex flex-col gap-3">
          {payments.length === 0 ? (
            <EmptyPaymentsState />
          ) : (
            payments.map((payment) => (
              <PaymentCard key={payment.id} payment={payment} />
            ))
          )}
        </div>
      )}
    </section>
  );
}

function EmptyPaymentsState() {
  return (
    <div className="text-center py-10 text-muted-foreground bg-card rounded-2xl border border-border border-dashed">
      <CreditCard size={36} aria-hidden className="mx-auto mb-3 opacity-60" />
      <p>No payments found.</p>
      <p className="text-sm mt-1">Your payment history will appear here.</p>
    </div>
  );
}

function PaymentCard({ payment }: { payment: PaymentType }) {
  // Stripe Checkout uses `payment_status: "paid"`, while PaymentIntents use `status: "succeeded"`.
  // Treat both as successful for consistent UX.
  const normalizedStatus = payment.status === "paid" ? "succeeded" : payment.status;
  const isSuccessful = normalizedStatus === "succeeded";

  return (
    <div className="border border-gray-100 p-4 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              isSuccessful ? "bg-green-50" : "bg-gray-50"
            }`}
          >
            {isSuccessful ? (
              <CheckCircle size={20} className="text-green-500" />
            ) : (
              <CreditCard size={20} className="text-gray-400" />
            )}
          </div>
          <div>
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <Calendar size={14} />
              {payment.createdAt
                ? formatDateTime(new Date(payment.createdAt).getTime())
                : "N/A"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              ID:{" "}
              {payment.id.length > 16
                ? `${payment.id.slice(0, 16)}…`
                : payment.id}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="flex items-center gap-1 text-lg font-semibold text-gray-900">
              <DollarSign size={18} />
              {(payment.amount / 100).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground uppercase">
              {payment.currency || "USD"}
            </div>
          </div>

          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              isSuccessful
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {normalizedStatus}
          </span>
        </div>
      </div>
    </div>
  );
}
