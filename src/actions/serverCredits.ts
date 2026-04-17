import { admin, adminDb } from "@/firebase/firebaseAdmin";
import { calculateNewBalance, coerceCredits } from "@/utils/credits";

type CreditsLedgerType = "debit" | "credit";

export interface CreditsLedgerMeta {
  /** High-level reason (e.g. "chat_message", "text_generation", "image_generation"). */
  reason: string;
  /** Optional logical tool key (e.g. "chat", "tools", "image"). */
  tool?: string;
  /** Optional model key. */
  modelKey?: string;
  /** Optional reference id (e.g. Stripe PaymentIntent id). */
  refId?: string;
}

function writeLedgerEntry(
  tx: FirebaseFirestore.Transaction,
  uid: string,
  entry: {
    type: CreditsLedgerType;
    amount: number;
    reason: string;
    tool?: string;
    modelKey?: string;
    refId?: string;
    balanceAfter?: number;
  },
  options?: { deterministicId?: string }
): void {
  const ref = options?.deterministicId
    ? adminDb.doc(`users/${uid}/creditsLedger/${options.deterministicId}`)
    : adminDb.collection(`users/${uid}/creditsLedger`).doc();

  tx.set(
    ref,
    {
      type: entry.type,
      amount: Math.max(0, Math.floor(entry.amount)),
      reason: entry.reason,
      tool: entry.tool ?? null,
      modelKey: entry.modelKey ?? null,
      refId: entry.refId ?? null,
      balanceAfter:
        typeof entry.balanceAfter === "number"
          ? Math.max(0, Math.floor(entry.balanceAfter))
          : null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function debitCreditsOrThrow(
  uid: string,
  amount: number,
  meta?: CreditsLedgerMeta
): Promise<number> {
  if (!Number.isFinite(amount) || amount <= 0) return getCredits(uid);

  const normalizedAmount = Math.ceil(amount);
  const profileRef = adminDb.doc(`users/${uid}/profile/userData`);

  return await adminDb.runTransaction(async (tx: FirebaseFirestore.Transaction) => {
    const snap = await tx.get(profileRef);
    const current = coerceCredits(snap.exists ? snap.data()?.credits : 0, 0);
    const next = calculateNewBalance(current, -normalizedAmount);

    tx.set(profileRef, { credits: next }, { merge: true });

    if (meta) {
      writeLedgerEntry(tx, uid, {
        type: "debit",
        amount: normalizedAmount,
        reason: meta.reason,
        tool: meta.tool,
        modelKey: meta.modelKey,
        refId: meta.refId,
        balanceAfter: next,
      });
    }
    return next;
  });
}

export async function creditCredits(
  uid: string,
  amount: number,
  meta?: CreditsLedgerMeta & { deterministicId?: string }
): Promise<number> {
  if (!Number.isFinite(amount) || amount <= 0) return getCredits(uid);

  const normalizedAmount = Math.floor(amount);
  const profileRef = adminDb.doc(`users/${uid}/profile/userData`);

  return await adminDb.runTransaction(async (tx: FirebaseFirestore.Transaction) => {
    const snap = await tx.get(profileRef);
    const current = coerceCredits(snap.exists ? snap.data()?.credits : 0, 0);
    const next = calculateNewBalance(current, normalizedAmount);

    tx.set(profileRef, { credits: next }, { merge: true });

    if (meta) {
      writeLedgerEntry(
        tx,
        uid,
        {
          type: "credit",
          amount: normalizedAmount,
          reason: meta.reason,
          tool: meta.tool,
          modelKey: meta.modelKey,
          refId: meta.refId,
          balanceAfter: next,
        },
        meta.deterministicId ? { deterministicId: meta.deterministicId } : undefined
      );
    }
    return next;
  });
}

export async function getCredits(uid: string): Promise<number> {
  const profileRef = adminDb.doc(`users/${uid}/profile/userData`);
  const snap = await profileRef.get();
  return coerceCredits(snap.exists ? snap.data()?.credits : 0, 0);
}
