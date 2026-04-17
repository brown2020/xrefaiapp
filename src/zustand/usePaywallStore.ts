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

const DEFAULT_CONTEXT: PaywallContext = { redirectPath: ROUTES.account };

/**
 * `closePaywall` intentionally does NOT reset `context`. This avoids a
 * visual flicker when the modal is about to close: if another caller
 * opens the paywall with a different context immediately after, or the
 * close animation runs for a beat, the prior context stays consistent.
 * The next `openPaywall` will replace it.
 */
export const usePaywallStore = create<PaywallState>((set) => ({
  isOpen: false,
  context: DEFAULT_CONTEXT,
  openPaywall: (context) =>
    set({
      isOpen: true,
      context: { ...DEFAULT_CONTEXT, ...context },
    }),
  closePaywall: () => set({ isOpen: false }),
}));
