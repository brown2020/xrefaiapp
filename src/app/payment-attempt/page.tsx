import { requireAuthedPage } from "@/utils/requireAuthedPage";
import PaymentAttemptClient from "@/components/PaymentAttemptClient";

export default async function PaymentAttempt() {
  await requireAuthedPage();
  return <PaymentAttemptClient />;
}
