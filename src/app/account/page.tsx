import Profile from "@/components/Profile";
import { requireAuthedPage } from "@/utils/requireAuthedPage";

export default async function ProfilePage() {
  await requireAuthedPage();
  return <Profile />;
}
