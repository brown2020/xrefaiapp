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

export async function saveHistoryServer(
  entry: SaveHistoryInput
): Promise<string> {
  const uid = await requireAuthedUid();
  const collRef = adminDb.collection(`users/${uid}/summaries`);
  const docRef = collRef.doc();

  await docRef.set({
    id: docRef.id,
    prompt: entry.prompt,
    response: entry.response,
    topic: entry.topic,
    words: entry.words,
    derivedFromId: entry.derivedFromId ?? null,
    tool: entry.tool ?? null,
    xrefs: entry.xrefs ?? [],
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
    prompt,
    response,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return docRef.id;
}
