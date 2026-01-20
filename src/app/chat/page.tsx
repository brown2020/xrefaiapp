import Chat from "@/components/Chat";
import { requireAuthedPage } from "@/utils/requireAuthedPage";

export default async function ChatPage() {
  await requireAuthedPage();
  return <Chat />;
}
