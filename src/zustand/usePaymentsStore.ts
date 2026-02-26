import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";
import {
  fetchPaymentsServer,
  addPaymentServer,
  checkPaymentProcessedServer,
  type ServerPayment,
} from "@/actions/serverPayments";

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
  fetchPayments: () => Promise<void>;
  addPayment: (payment: Omit<PaymentType, "createdAt">) => Promise<void>;
  checkIfPaymentProcessed: (paymentId: string) => Promise<PaymentType | null>;
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

  fetchPayments: async () => {
    const uid = useAuthStore.getState().uid;
    if (!uid) return;

    set({ paymentsLoading: true });

    try {
      const serverPayments = await fetchPaymentsServer();
      set({ payments: serverPayments.map(toPaymentType), paymentsLoading: false });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error fetching payments";
      console.error("Error fetching payments:", msg);
      set({ paymentsError: msg, paymentsLoading: false });
    }
  },

  addPayment: async (payment) => {
    const uid = useAuthStore.getState().uid;
    if (!uid) return;

    set({ paymentsLoading: true });

    try {
      const created = await addPaymentServer({
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        mode: payment.mode,
        currency: payment.currency,
        platform: payment.platform,
        productId: payment.productId,
      });

      set((state) => ({
        payments: [toPaymentType(created), ...state.payments],
        paymentsLoading: false,
      }));

      toast.success("Payment added successfully.");
    } catch (error) {
      if (error instanceof Error && error.message === "PAYMENT_ALREADY_EXISTS") {
        toast.error("Payment with this ID already exists.");
        set({ paymentsLoading: false });
        return;
      }
      const msg = error instanceof Error ? error.message : "Error adding payment";
      console.error("Error adding payment:", msg);
      set({ paymentsError: msg, paymentsLoading: false });
    }
  },

  checkIfPaymentProcessed: async (paymentId) => {
    const uid = useAuthStore.getState().uid;
    if (!uid) return null;

    const result = await checkPaymentProcessedServer(paymentId);
    return result ? toPaymentType(result) : null;
  },
}));
