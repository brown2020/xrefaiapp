"use client";

import {
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";

import { useEffect, useState } from "react";
import { createPaymentIntent } from "@/actions/paymentActions";
import convertToSubcurrency from "@/utils/convertToSubcurrency";
import { LoadingSpinner, InlineSpinner } from "@/components/ui/LoadingSpinner";

type Props = { amount: number };

export default function PaymentCheckoutPage({ amount }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function initializePayment() {
      try {
        const secret = await createPaymentIntent(convertToSubcurrency(amount));
        if (secret) setClientSecret(secret);
      } catch (error: unknown) {
        if (error instanceof Error) {
          setErrorMessage(
            error.message || "Failed to initialize payment. Please try again."
          );
        } else {
          setErrorMessage("An unknown error occurred.");
        }
      }
    }

    initializePayment();
  }, [amount]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setLoading(true);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setErrorMessage(submitError.message || "Payment failed");
        setLoading(false);
        return;
      }

      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success?amount=${amount}&redirect=/account`,
        },
      });

      if (error) {
        setErrorMessage(error.message || "Payment failed");
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setErrorMessage(
          error.message || "Payment validation failed. Please try again."
        );
        console.error("Payment validation error:", error.message);
      } else {
        setErrorMessage("An unknown error occurred.");
        console.error("Unknown error occurred during payment validation.");
      }
    }

    setLoading(false);
  };

  if (!clientSecret) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-[#F0F6FF]">
        <LoadingSpinner size="lg" text="Initializing payment..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F0F6FF] px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-[#9C26D7] to-[#1EB1DB] py-6 px-6 text-center">
          <h2 className="text-3xl font-bold text-white">XREF.AI</h2>
        </div>

        <div className="p-6">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-[#041D34] mb-2">
              Complete Your Purchase
            </h1>
            <p className="text-[#0B3C68]">
              You are purchasing{" "}
              <span className="font-bold text-[#02C173]">${amount}</span> worth
              of credits
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-[#F8FAFC] p-4 rounded-lg">
              <PaymentElement />
            </div>

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {errorMessage}
              </div>
            )}

            <button
              disabled={!stripe || loading}
              className="w-full py-3 px-4 bg-[#192449] text-white font-semibold rounded-xl hover:bg-[#83A873] transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <InlineSpinner size="sm" />
                  Processing...
                </span>
              ) : (
                `Pay $${amount}`
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#7F8CA1]">
            <p>Secure payment processed by Stripe</p>
          </div>
        </div>
      </div>
    </div>
  );
}
