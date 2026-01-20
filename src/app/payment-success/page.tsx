import PaymentSuccessPage from "@/components/PaymentSuccessPage";
import { requireAuthedPage } from "@/utils/requireAuthedPage";

export default async function PaymentSuccess() {
  await requireAuthedPage();
  return <PaymentSuccessPage />;
}
