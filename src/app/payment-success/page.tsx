import { Suspense } from "react";
import PaymentSuccessPage from "@/components/PaymentSuccessPage";

export default function PaymentSuccess() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen w-full bg-muted/30">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <PaymentSuccessPage />
    </Suspense>
  );
}
