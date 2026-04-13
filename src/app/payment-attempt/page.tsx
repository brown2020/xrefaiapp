import { Suspense } from "react";
import PaymentAttemptClient from "@/components/PaymentAttemptClient";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function PaymentAttempt() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen w-full bg-muted/30">
          <LoadingSpinner size="lg" text="Loading checkout..." />
        </div>
      }
    >
      <PaymentAttemptClient />
    </Suspense>
  );
}
