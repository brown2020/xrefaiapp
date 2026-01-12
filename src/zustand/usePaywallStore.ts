import { create } from "zustand";
import { ROUTES } from "@/constants/routes";

export type PaywallContext = {
  actionLabel?: string;
  requiredCredits?: number;
  redirectPath?: string;
};

type PaywallState = {
  isOpen: boolean;
  context: PaywallContext;
  openPaywall: (context: PaywallContext) => void;
  closePaywall: () => void;
};

export const usePaywallStore = create<PaywallState>((set) => ({
  isOpen: false,
  context: { redirectPath: ROUTES.account },
  openPaywall: (context) =>
    set({
      isOpen: true,
      context: { redirectPath: ROUTES.account, ...context },
    }),
  closePaywall: () => set({ isOpen: false, context: { redirectPath: ROUTES.account } }),
}));

