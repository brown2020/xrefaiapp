"use server";

import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/firebase/firebaseAdmin";
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
      createdAt: ts instanceof Timestamp
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
