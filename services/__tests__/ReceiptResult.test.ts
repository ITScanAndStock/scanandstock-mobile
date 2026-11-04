import { describe, expect, it } from "vitest";
import type { OrderItem } from "../../model/Order";
import { createReceiptDraft } from "../ReceiptDraft";
import { receiptResult } from "../ReceiptResult";

function item(orderItemId: number, itemDesignation: string, itemQuantity: number, itemDeliveredQuantity: number): OrderItem {
  return { orderItemId, itemProductId: 100 + orderItemId, itemProviderId: 3, itemDesignation, itemQuantity, itemDeliveredQuantity };
}

// 1: 2/6 received, 3 scanned now. 2: 0/6, all 6 scanned. 3: 0/5, nothing scanned. 4: 1/2, 3 entered by hand.
function draftOfFourLines() {
  const draft = createReceiptDraft([
    item(1, "Composite Filtek Z250 A2", 6, 2),
    item(2, "Gants nitrile taille M", 6, 0),
    item(3, "Fraise diamantée 856 016", 5, 0),
    item(4, "Articaïne 4 %", 2, 1),
  ]);
  draft.addBatch(1, { quantity: 3, batchNumber: "LT2291" });
  draft.addBatch(2, { quantity: 6 });
  draft.addBatch(4, { quantity: 3 });
  return draft;
}

describe("receiptResult", () => {
  it("counts the products entered, line by line (catches: entered counted in lines or batches)", () => {
    const result = receiptResult(draftOfFourLines().lines());

    expect(result.entered).toBe(12);
    expect(result.received.map(({ orderItemId, quantity }) => [orderItemId, quantity])).toEqual([
      [1, 3],
      [2, 6],
      [4, 3],
    ]);
  });

  it("leaves to receive what was neither received before nor now (catches: rest computed without the quantity received before)", () => {
    const result = receiptResult(draftOfFourLines().lines());

    expect(result.remaining).toEqual([
      { orderItemId: 1, designation: "Composite Filtek Z250 A2", quantity: 1 },
      { orderItemId: 3, designation: "Fraise diamantée 856 016", quantity: 5 },
    ]);
  });

  it("recalls a line received beyond the quantity ordered (catches: excess not reported; excess listed as a negative rest)", () => {
    const result = receiptResult(draftOfFourLines().lines());

    expect(result.received.find((line) => line.orderItemId === 4)?.over).toBe(2);
    expect(result.received.find((line) => line.orderItemId === 1)?.over).toBe(0);
    expect(result.remaining.some((line) => line.orderItemId === 4)).toBe(false);
  });

  it("recalls only the excess of this receipt on a line already over-received (catches: earlier excess counted again)", () => {
    const draft = createReceiptDraft([item(1, "Composite Filtek Z250 A2", 2, 3)]);
    draft.addBatch(1, { quantity: 1 });

    expect(receiptResult(draft.lines()).received[0].over).toBe(1);
  });

  it("leaves nothing to receive once every line is complete (catches: complete lines listed with a rest of 0)", () => {
    const draft = createReceiptDraft([item(1, "Composite Filtek Z250 A2", 6, 4)]);
    draft.addBatch(1, { quantity: 2 });

    expect(receiptResult(draft.lines()).remaining).toEqual([]);
  });
});
