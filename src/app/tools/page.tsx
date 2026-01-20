import Tools from "@/components/Tools";
import { requireAuthedPage } from "@/utils/requireAuthedPage";

export default async function ToolsPage() {
  await requireAuthedPage();
  return <Tools />;
}
