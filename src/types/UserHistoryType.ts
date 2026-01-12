import { Timestamp } from "firebase/firestore";

export type UserHistoryType = {
  timestamp: Timestamp;
  prompt: string;
  response: string;
  topic: string;
  xrefs: string[];
  words: string;
  id: string;
  /**
   * Optional linkage for “repurpose/derived” history items.
   * Allows the UI to show “Derived from …” and group outputs later.
   */
  derivedFromId?: string;
  /**
   * Optional tool/action identifier (e.g. "repurpose:linkedin").
   */
  tool?: string;
};
