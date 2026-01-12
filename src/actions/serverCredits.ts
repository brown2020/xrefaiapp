import { adminDb } from "@/firebase/firebaseAdmin";

function coerceCredits(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export async function debitCreditsOrThrow(
  uid: string,
  amount: number
): Promise<number> {
  if (!Number.isFinite(amount) || amount <= 0) return getCredits(uid);

  const profileRef = adminDb.doc(`users/${uid}/profile/userData`);
  return await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(profileRef);
    const current = coerceCredits(snap.exists ? snap.data()?.credits : 0, 0);
    const next = current - amount;
    if (!Number.isFinite(next)) throw new Error("Invalid credits value");
    if (next < 0) throw new Error("INSUFFICIENT_CREDITS");
    tx.set(profileRef, { credits: next }, { merge: true });
    return next;
  });
}

export async function creditCredits(
  uid: string,
  amount: number
): Promise<number> {
  if (!Number.isFinite(amount) || amount <= 0) return getCredits(uid);

  const profileRef = adminDb.doc(`users/${uid}/profile/userData`);
  return await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(profileRef);
    const current = coerceCredits(snap.exists ? snap.data()?.credits : 0, 0);
    const next = current + amount;
    if (!Number.isFinite(next)) throw new Error("Invalid credits value");
    tx.set(profileRef, { credits: next }, { merge: true });
    return next;
  });
}

export async function getCredits(uid: string): Promise<number> {
  const profileRef = adminDb.doc(`users/${uid}/profile/userData`);
  const snap = await profileRef.get();
  return coerceCredits(snap.exists ? snap.data()?.credits : 0, 0);
}

