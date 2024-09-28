import { Timestamp } from "firebase/firestore";

export type UserHistoryType = {
  timestamp: Timestamp;
  prompt: string;
  response: string;
  topic: string;
  xrefs: string[];
  words: string;
  id: string;
};
