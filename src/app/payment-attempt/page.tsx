"use client";

import PaymentCheckoutPage from "@/components/PaymentCheckoutPage";
import convertToSubcurrency from "@/utils/convertToSubcurrency";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useSearchParams } from "next/navigation";
import { getCreditPack } from "@/constants/creditPacks";
import { ROUTES } from "@/constants/routes";

if (process.env.NEXT_PUBLIC_STRIPE_KEY === undefined) {
  throw new Error("NEXT_PUBLIC_STRIPE_KEY is not defined");
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY);

export default function PaymentAttempt() {
  const searchParams = useSearchParams();
  const packId = searchParams.get("pack");
  const redirect = searchParams.get("redirect") || ROUTES.account;
  const pack = getCreditPack(packId);
  const amount = pack.amountCents / 100;

  return (
    <Elements
      stripe={stripePromise}
      options={{
        mode: "payment",
        amount: convertToSubcurrency(amount),
        currency: "usd",
      }}
    >
      <PaymentCheckoutPage amount={amount} packId={pack.id} redirectPath={redirect} />
    </Elements>
  );
}
