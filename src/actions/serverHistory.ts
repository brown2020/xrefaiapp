"use server";

import { adminDb, admin } from "@/firebase/firebaseAdmin";
import { requireAuthedUid } from "@/actions/serverAuth";

export interface SaveHistoryInput {
  prompt: string;
  response: string;
  topic: string;
  words: string;
  xrefs?: string[];
  derivedFromId?: string;
  tool?: string;
}

/** Hard size caps to prevent oversized Firestore documents. */
const MAX_PROMPT_LEN = 20_000;
const MAX_RESPONSE_LEN = 50_000;
const MAX_SHORT_LEN = 200;
const MAX_XREFS = 20;
const MAX_XREF_LEN = 2_000;

function clampString(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  return value.slice(0, maxLen);
}

export async function saveHistoryServer(
  entry: SaveHistoryInput
): Promise<string> {
  const uid = await requireAuthedUid();
  const collRef = adminDb.collection(`users/${uid}/summaries`);
  const docRef = collRef.doc();

  const safeXrefs = Array.isArray(entry.xrefs)
    ? entry.xrefs.slice(0, MAX_XREFS).map((x) => clampString(x, MAX_XREF_LEN))
    : [];

  await docRef.set({
    id: docRef.id,
    prompt: clampString(entry.prompt, MAX_PROMPT_LEN),
    response: clampString(entry.response, MAX_RESPONSE_LEN),
    topic: clampString(entry.topic, MAX_SHORT_LEN),
    words: clampString(entry.words, MAX_SHORT_LEN),
    derivedFromId: entry.derivedFromId
      ? clampString(entry.derivedFromId, MAX_SHORT_LEN)
      : null,
    tool: entry.tool ? clampString(entry.tool, MAX_SHORT_LEN) : null,
    xrefs: safeXrefs,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return docRef.id;
}

export async function saveChatServer(
  prompt: string,
  response: string
): Promise<string> {
  const uid = await requireAuthedUid();
  const collRef = adminDb.collection(`users/${uid}/chats`);
  const docRef = collRef.doc();

  await docRef.set({
    prompt: clampString(prompt, MAX_PROMPT_LEN),
    response: clampString(response, MAX_RESPONSE_LEN),
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return docRef.id;
}
