import Tools from "@/components/Tools";
import { isToolKey } from "@/constants/toolMetadata";
import {
  getSearchParam,
  getSearchParamInt,
  type PageSearchParams,
} from "@/utils/queryParams";

/** Image generation runs as a server action on this route and can take over a minute. */
export const maxDuration = 120;

export default async function ToolsPage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const params = searchParams ? await searchParams : undefined;
  const tool = getSearchParam(params, "tool");

  return (
    <Tools
      initialTool={isToolKey(tool) ? tool : undefined}
      initialInput={getSearchParam(params, "prompt")}
      initialFocus={getSearchParam(params, "focus")}
      initialWords={getSearchParamInt(params, "words")}
      starterIntentId={getSearchParam(params, "intent")}
    />
  );
}
