import "server-only";

import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { requireAuthedUid } from "@/actions/serverAuth";

export async function requireAuthedPage(): Promise<string> {
  try {
    return await requireAuthedUid();
  } catch {
    redirect(ROUTES.home);
  }
}
