"use client";

import { useAuthStore } from "@/zustand/useAuthStore";
import { usePaymentsStore, PaymentType } from "@/zustand/usePaymentsStore";
import { useEffect } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CreditCard, Calendar, DollarSign, CheckCircle } from "lucide-react";

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
    <div className="flex flex-col container mt-4 mx-auto gap-4">
      <div className="text-3xl font-bold text-center">
        <span className="bg-gradient-to-r from-[#9C26D7] to-[#1EB1DB] bg-clip-text text-transparent">
          Payment History
        </span>
      </div>

      {paymentsLoading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" text="Loading payments..." />
        </div>
      )}

      {paymentsError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error: {paymentsError}
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
    </div>
  );
}

function EmptyPaymentsState() {
  return (
    <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100 border-dashed">
      <CreditCard size={48} className="mx-auto mb-4 opacity-50" />
      <p>No payments found.</p>
      <p className="text-sm mt-1">Your payment history will appear here.</p>
    </div>
  );
}

function PaymentCard({ payment }: { payment: PaymentType }) {
  const isSuccessful = payment.status === "succeeded";

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
                ? payment.createdAt.toDate().toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "N/A"}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              ID: {payment.id.slice(0, 16)}...
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="flex items-center gap-1 text-lg font-semibold text-gray-900">
              <DollarSign size={18} />
              {(payment.amount / 100).toFixed(2)}
            </div>
            <div className="text-xs text-gray-400 uppercase">
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
            {payment.status}
          </span>
        </div>
      </div>
    </div>
  );
}
