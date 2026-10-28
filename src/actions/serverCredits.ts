import { FieldValue, Timestamp, type Transaction } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/firebaseAdmin";
import { calculateNewBalance, coerceCredits } from "@/utils/credits";
import { DEFAULT_IDEMPOTENCY_TTL_MS } from "@/utils/idempotency";

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
  tx: Transaction,
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
      createdAt: FieldValue.serverTimestamp(),
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

  return await adminDb.runTransaction(async (tx) => {
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
  const deterministicId = meta?.deterministicId;
  const ledgerRef = deterministicId
    ? adminDb.doc(`users/${uid}/creditsLedger/${deterministicId}`)
    : null;

  return await adminDb.runTransaction(async (tx) => {
    // Idempotency: a credit pinned to a deterministic ledger id (e.g. a refund)
    // must only ever apply once. If the ledger doc already exists, treat the
    // credit as already applied and return the current balance unchanged.
    // (All reads must precede writes within a Firestore transaction.)
    if (ledgerRef) {
      const existing = await tx.get(ledgerRef);
      if (existing.exists) {
        const profileSnap = await tx.get(profileRef);
        return coerceCredits(
          profileSnap.exists ? profileSnap.data()?.credits : 0,
          0
        );
      }
    }

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
        deterministicId ? { deterministicId } : undefined
      );
    }
    return next;
  });
}

export type IdempotentDebitResult =
  | { isNew: true; balance: number }
  | { isNew: false; status: "processing" | "completed" };

function idempotencyExpiry(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

/**
 * Marks the idempotency key and debits credits in one transaction.
 * A crash between those two writes can no longer leave a charged request
 * without a key, or a processing key without a charge.
 */
export async function debitCreditsIdempotent(
  uid: string,
  idempotencyKey: string,
  amount: number,
  meta: CreditsLedgerMeta
): Promise<IdempotentDebitResult> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("INVALID_DEBIT");
  }

  const normalizedAmount = Math.ceil(amount);
  const idempotencyRef = adminDb.doc(`users/${uid}/idempotency/${idempotencyKey}`);
  const profileRef = adminDb.doc(`users/${uid}/profile/userData`);

  return await adminDb.runTransaction(async (tx) => {
    const existing = await tx.get(idempotencyRef);
    if (existing.exists) {
      const data = existing.data() as
        | { expiresAt?: Timestamp | Date | null; status?: "processing" | "completed" }
        | undefined;
      const expiresAt = idempotencyExpiry(data?.expiresAt);
      if (!expiresAt || expiresAt.getTime() >= Date.now()) {
        return {
          isNew: false as const,
          status: data?.status === "completed" ? ("completed" as const) : ("processing" as const),
        };
      }
    }

    const profileSnap = await tx.get(profileRef);
    const current = coerceCredits(profileSnap.exists ? profileSnap.data()?.credits : 0, 0);
    const next = calculateNewBalance(current, -normalizedAmount);
    const now = new Date();

    tx.set(idempotencyRef, {
      processedAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(now.getTime() + DEFAULT_IDEMPOTENCY_TTL_MS),
      status: "processing",
    });
    tx.set(profileRef, { credits: next }, { merge: true });
    writeLedgerEntry(tx, uid, {
      type: "debit",
      amount: normalizedAmount,
      reason: meta.reason,
      tool: meta.tool,
      modelKey: meta.modelKey,
      refId: meta.refId ?? idempotencyKey,
      balanceAfter: next,
    });

    return { isNew: true as const, balance: next };
  });
}

export async function getCredits(uid: string): Promise<number> {
  const profileRef = adminDb.doc(`users/${uid}/profile/userData`);
  const snap = await profileRef.get();
  return coerceCredits(snap.exists ? snap.data()?.credits : 0, 0);
}
