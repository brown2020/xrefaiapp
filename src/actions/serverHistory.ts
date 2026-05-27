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
  starterIntentId?: string;
  settings?: Record<string, unknown>;
}

/** Hard size caps to prevent oversized Firestore documents. */
const MAX_PROMPT_LEN = 20_000;
const MAX_RESPONSE_LEN = 50_000;
const MAX_SHORT_LEN = 200;
const MAX_XREFS = 20;
const MAX_XREF_LEN = 2_000;
const MAX_SETTINGS = 20;
const MAX_SETTING_KEY_LEN = 80;
const MAX_SETTING_VALUE_LEN = 500;
const SETTING_KEY_PATTERN = /^[A-Za-z0-9_.:-]+$/;

function clampString(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  return value.slice(0, maxLen);
}

function sanitizeSettings(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const settings: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(value).slice(
    0,
    MAX_SETTINGS
  )) {
    const key = clampString(rawKey, MAX_SETTING_KEY_LEN);
    const settingValue = clampString(rawValue, MAX_SETTING_VALUE_LEN);
    if (!key || !settingValue || !SETTING_KEY_PATTERN.test(key)) continue;
    settings[key] = settingValue;
  }

  return Object.keys(settings).length > 0 ? settings : null;
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
    starterIntentId: entry.starterIntentId
      ? clampString(entry.starterIntentId, MAX_SHORT_LEN)
      : null,
    settings: sanitizeSettings(entry.settings),
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
