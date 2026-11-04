import { describe, expect, it } from "vitest";
import type { OrderItem } from "../../model/Order";
import { receiptBanner } from "../ReceiptBanner";
import type { DraftLine } from "../ReceiptDraft";

function line(orderItemId: number, overrides: Partial<OrderItem> = {}): DraftLine {
  const item: OrderItem = {
    orderItemId,
    itemProductId: orderItemId * 10,
    itemProviderId: orderItemId,
    itemProviderName: `Fournisseur ${orderItemId}`,
    itemDesignation: `Produit ${orderItemId}`,
    itemQuantity: 6,
    itemDeliveredQuantity: 0,
    ...overrides,
  };
  return { item, deliveredAtStart: item.itemDeliveredQuantity, batches: [] };
}

const LINES = [line(1), line(2, { itemDesignation: "Composite Filtek Z250 A2" })];

const added = { kind: "added", orderItemId: 2, merged: false, providerChoice: false } as const;

describe("receiptBanner", () => {
  it("shows the added line, its batch and its expiration as MM/yyyy (catches: first line shown, dd-MM-yyyy shown as is)", () => {
    expect(receiptBanner({ ...added, batchNumber: "LT2291", expirationDate: "31-03-2028" }, LINES)).toEqual({
      tone: "success",
      title: "+1 Composite Filtek Z250 A2",
      detail: "Lot LT2291 · péremption 03/2028",
    });
  });

  it("names the chosen line's provider when another provider's line matched too (catches: provider never named, first line's provider)", () => {
    expect(receiptBanner({ ...added, batchNumber: "LT2291", providerChoice: true }, LINES)).toMatchObject({
      detail: "Lot LT2291 · Fournisseur 2",
    });
  });

  it("does not name the provider when no other provider matched (catches: provider always named)", () => {
    expect(receiptBanner({ ...added, expirationDate: "31-03-2028" }, LINES)).toMatchObject({
      detail: "péremption 03/2028",
    });
  });

  it("has no detail for a code without batch or date (catches: empty batch and date written out)", () => {
    expect(receiptBanner(added, LINES)).toEqual({ tone: "success", title: "+1 Composite Filtek Z250 A2" });
  });

  it("refuses a complete line with its designation (catches: complete line read as not in the order)", () => {
    expect(receiptBanner({ kind: "lineComplete", orderItemId: 2 }, LINES)).toEqual({
      tone: "error",
      title: "Ligne complète",
      detail: "Composite Filtek Z250 A2",
    });
  });

  it("tells a code not in the order from a code that could not be checked (catches: one message for both)", () => {
    expect(receiptBanner({ kind: "notInOrder" }, LINES)).toEqual({
      tone: "error",
      title: "Ce produit n'est pas dans la commande",
    });
    expect(receiptBanner({ kind: "unverifiable" }, LINES)).toEqual({
      tone: "error",
      title: "Impossible de vérifier ce code",
      detail: "Vérifiez la connexion, puis scannez de nouveau",
    });
  });
});
