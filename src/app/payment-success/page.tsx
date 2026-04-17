import { Suspense } from "react";
import PaymentSuccessPage from "@/components/PaymentSuccessPage";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function PaymentSuccess() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen w-full bg-muted/30">
          <LoadingSpinner size="lg" text="Loading..." />
        </div>
      }
    >
      <PaymentSuccessPage />
    </Suspense>
  );
}
