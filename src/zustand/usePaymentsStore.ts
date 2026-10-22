import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import { fetchPaymentsServer, type ServerPayment } from "@/actions/serverPayments";

export type PaymentType = {
  docId?: string;
  id: string;
  amount: number;
  createdAt: string | null;
  status: string;
  mode: string;
  platform: string;
  productId: string;
  currency: string;
};

interface PaymentsStoreState {
  payments: PaymentType[];
  paymentsLoading: boolean;
  paymentsError: string | null;
  resetPayments: () => void;
  fetchPayments: () => Promise<void>;
}

function toPaymentType(sp: ServerPayment): PaymentType {
  return {
    docId: sp.docId,
    id: sp.id,
    amount: sp.amount,
    createdAt: sp.createdAt,
    status: sp.status,
    mode: sp.mode,
    platform: sp.platform,
    productId: sp.productId,
    currency: sp.currency,
  };
}

export const usePaymentsStore = create<PaymentsStoreState>((set) => ({
  payments: [],
  paymentsLoading: false,
  paymentsError: null,

  resetPayments: () =>
    set({ payments: [], paymentsLoading: false, paymentsError: null }),

  fetchPayments: async () => {
    const uid = useAuthStore.getState().uid;
    if (!uid) return;

    set({ paymentsLoading: true, paymentsError: null });

    try {
      const serverPayments = await fetchPaymentsServer();
      set({ payments: serverPayments.map(toPaymentType), paymentsLoading: false });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error fetching payments";
      console.error("Error fetching payments:", msg);
      set({ paymentsError: msg, paymentsLoading: false });
    }
  },
}));
