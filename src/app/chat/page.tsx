import Chat from "@/components/Chat";
import {
  getSearchParam,
  type PageSearchParams,
} from "@/utils/queryParams";

export default async function ChatPage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const params = searchParams ? await searchParams : undefined;

  return (
    <Chat
      initialPrompt={getSearchParam(params, "prompt")}
      starterIntentId={getSearchParam(params, "intent")}
    />
  );
}
