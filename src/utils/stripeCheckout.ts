/**
 * A Checkout Session grants a pack only when Stripe collected the catalog
 * price in USD. Presentment currency must not satisfy the cent comparison.
 */
export function paidCheckoutMatchesPack(
  session: { amount_total?: number | null; currency?: string | null },
  pack: { amountCents: number }
): boolean {
  return (
    (session.currency ?? "").toLowerCase() === "usd" &&
    session.amount_total === pack.amountCents
  );
}
