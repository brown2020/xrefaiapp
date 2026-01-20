import History from "@/components/History";
import { requireAuthedPage } from "@/utils/requireAuthedPage";

export default async function HistoryPage() {
  await requireAuthedPage();
  return <History />;
}
