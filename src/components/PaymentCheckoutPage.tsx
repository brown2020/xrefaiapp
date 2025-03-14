"use client";

import {
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";

import { useEffect, useState } from "react";
import { createPaymentIntent } from "@/actions/paymentActions";
import convertToSubcurrency from "@/utils/convertToSubcurrency";
import { ClipLoader } from "react-spinners";

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
          return_url: `${window.location.origin}/payment-success?amount=${amount}`,
        },
      });

      if (error) {
        setErrorMessage(error.message || "Payment failed");
        console.log("Payment failed:", error.message);
      } else {
        console.log("Payment successful!");
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
      <div className="flex items-center justify-center max-w-6xl h-36 mx-auto w-full">
        <ClipLoader color="#4A90E2" size={36} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F0F6FF] p-4">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
        <div className="flex justify-center mb-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-[#9C26D7] to-[#1EB1DB] bg-clip-text text-transparent">
            XREF.AI
          </h2>
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Complete Your Purchase
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PaymentElement />
          {errorMessage && <p className="text-red-500">{errorMessage}</p>}
          <button
            disabled={!stripe || loading}
            className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
          >
            {loading ? "Processing..." : `Pay $${amount}`}
          </button>
        </form>
      </div>
    </div>
  );
}
