"use server";

import { adminDb, admin } from "@/firebase/firebaseAdmin";
import { requireAuthedUid } from "@/actions/serverAuth";

export interface ServerPayment {
  docId: string;
  id: string;
  amount: number;
  createdAt: string | null;
  status: string;
  mode: string;
  platform: string;
  productId: string;
  currency: string;
}

export async function fetchPaymentsServer(): Promise<ServerPayment[]> {
  const uid = await requireAuthedUid();
  const snap = await adminDb
    .collection(`users/${uid}/payments`)
    .orderBy("createdAt", "desc")
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    const ts = data.createdAt;
    return {
      docId: doc.id,
      id: data.id ?? doc.id,
      amount: data.amount ?? 0,
      createdAt: ts instanceof admin.firestore.Timestamp
        ? ts.toDate().toISOString()
        : null,
      status: data.status ?? "",
      mode: data.mode ?? "",
      platform: data.platform ?? "",
      productId: data.productId ?? "",
      currency: data.currency ?? "",
    };
  });
}

export async function checkPaymentProcessedServer(
  paymentId: string
): Promise<ServerPayment | null> {
  const uid = await requireAuthedUid();
  const snap = await adminDb
    .collection(`users/${uid}/payments`)
    .where("id", "==", paymentId)
    .where("status", "==", "succeeded")
    .limit(1)
    .get();

  if (snap.empty) return null;

  const doc = snap.docs[0];
  const data = doc.data();
  const ts = data.createdAt;
  return {
    docId: doc.id,
    id: data.id ?? doc.id,
    amount: data.amount ?? 0,
    createdAt: ts instanceof admin.firestore.Timestamp
      ? ts.toDate().toISOString()
      : null,
    status: data.status ?? "",
    mode: data.mode ?? "",
    platform: data.platform ?? "",
    productId: data.productId ?? "",
    currency: data.currency ?? "",
  };
}

export async function addPaymentServer(payment: {
  id: string;
  amount: number;
  status: string;
  mode: string;
  currency: string;
  platform: string;
  productId: string;
}): Promise<ServerPayment> {
  const uid = await requireAuthedUid();

  const existing = await adminDb
    .collection(`users/${uid}/payments`)
    .where("id", "==", payment.id)
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new Error("PAYMENT_ALREADY_EXISTS");
  }

  const docRef = adminDb.collection(`users/${uid}/payments`).doc();
  const now = admin.firestore.FieldValue.serverTimestamp();

  await docRef.set({
    ...payment,
    createdAt: now,
  });

  return {
    docId: docRef.id,
    ...payment,
    createdAt: new Date().toISOString(),
  };
}
