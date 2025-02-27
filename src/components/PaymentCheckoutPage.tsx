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
import RootLayout from "@/app/layout";

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

  if (!clientSecret || !stripe || !elements) {
    return (
      <div className="flex items-center justify-center max-w-6xl h-36 mx-auto w-full">
        <ClipLoader color="#4A90E2" size={36} />
      </div>
    );
  }

  return (
    <RootLayout showFooter={true}>
    <main className="flex flex-col  items-center container  mx-auto py-10">
      <div className="mb-10">
        <h1 className="text-2xl text-[#041D34]">Buy <span className="text-[#02C173] font-bold text-4xl">10,000</span> Credits</h1>
        <h2 className="text-2xl text-[#041D34]">
          Purchase amount: <span className="font-bold text-[#02C173] text-4xl">${amount}</span>
        </h2>
      </div>
      <form onSubmit={handleSubmit} className="bg-[#E7EAEF] p-2 rounded-md w-full">
        {clientSecret && <PaymentElement />}

        {errorMessage && <p className="text-red-500">{errorMessage}</p>}

        <button
          disabled={!stripe || loading}
          className="text-white w-full p-5 bg-black mt-2 rounded-md font-bold disabled:opacity-50 disabled:animate-pulse"
        >
          {!loading ? `Pay $${amount}` : "Processing..."}
        </button>
      </form>
    </main>
    </RootLayout>
  );
}
