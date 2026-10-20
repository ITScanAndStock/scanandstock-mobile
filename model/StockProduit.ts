/** Single lot / batch on a stock product fiche. */
export type StockLot = {
  id: string;
  lotNumber: string;
  quantity: number;
  /** ISO date or display date — péremption. */
  expiresAt: string;
  /** Optional relative hint, e.g. "dans 6 semaines". */
  expiresHint?: string | null;
  /** Highlight when expiring soon. */
  expiringSoon?: boolean;
  /** Lot already consumed / used. */
  used?: boolean;
};

/** Product row on the Stock list + detail fiche. */
export type StockProduit = {
  id: string;
  designation: string;
  supplier: string;
  category: string;
  quantity: number;
  threshold: number;
  /** Units currently ordered / awaiting delivery — optional badge. */
  orderedQty?: number;
  reference?: string;
  idealStock?: number;
  perBox?: number;
  purchasePrice?: number;
  currency?: string;
  lots?: StockLot[];
};

export function isBelowThreshold(item: StockProduit): boolean {
  return item.quantity < item.threshold;
}

export function formatPurchasePrice(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function getActiveLots(item: StockProduit): StockLot[] {
  return (item.lots ?? []).filter((lot) => !lot.used);
}

export function getUsedLots(item: StockProduit): StockLot[] {
  return (item.lots ?? []).filter((lot) => lot.used);
}
