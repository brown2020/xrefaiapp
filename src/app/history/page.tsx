import History from "@/components/History";

/** Repurpose runs as a server action on this route and must outlive the text timeout. */
export const maxDuration = 120;

export default function HistoryPage() {
  return <History />;
}
