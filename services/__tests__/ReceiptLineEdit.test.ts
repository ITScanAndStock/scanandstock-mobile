import { describe, expect, it } from "vitest";
import type { OrderItem } from "../../model/Order";
import { createReceiptDraft, type ReceiptDraft } from "../ReceiptDraft";
import { lineForm, maskExpiration, priceOffered, saveLineForm } from "../ReceiptLineEdit";

const GTIN = "3401234567890";

const ITEM: OrderItem = {
  orderItemId: 1,
  itemProductId: 10,
  itemProviderId: 7,
  itemDesignation: "Composite Filtek Z250 A2",
  itemGtin: GTIN,
  itemQuantity: 6,
  itemPrice: 12.5,
  itemDeliveredQuantity: 0,
};

const lineOf = (draft: ReceiptDraft) => draft.lines()[0];

describe("ReceiptLineEdit", () => {
  it("puts a date typed as decoded in the decoded code's batch (catches: day forced to the 1st)", () => {
    const draft = createReceiptDraft([ITEM]);
    const form = lineForm(lineOf(draft));
    form.rows.push({ quantity: "1", batchNumber: "LT2291", expiration: "03/05/2028" });

    saveLineForm(draft, lineOf(draft), form);
    draft.apply({ group: 1, gtin: GTIN, batchNumber: "LT2291", expirationDate: "03-05-2028" });

    expect(draft.receiveBody().items[0].batches).toEqual([
      { quantity: 2, batchNumber: "LT2291", expirationDate: "03-05-2028" },
    ]);
  });

  it("refuses an impossible date and leaves the line as it was (catches: day checked against 31 only)", () => {
    const draft = createReceiptDraft([ITEM]);
    draft.apply({ group: 1, gtin: GTIN });
    const form = lineForm(lineOf(draft));
    form.rows[0].expiration = "31/02/2027";

    const saved = saveLineForm(draft, lineOf(draft), form);

    expect(saved).toEqual({ kind: "invalid", message: "Date de péremption impossible : 31/02/2027" });
    expect(draft.receiveBody().items[0].batches).toEqual([{ quantity: 1 }]);
  });

  it("shows a decoded date in full, to be corrected (catches: month and year only)", () => {
    const draft = createReceiptDraft([ITEM]);
    draft.apply({ group: 1, gtin: GTIN, batchNumber: "LT2291", expirationDate: "03-05-2028" });

    expect(lineForm(lineOf(draft)).rows).toEqual([{ quantity: "1", batchNumber: "LT2291", expiration: "03/05/2028" }]);
  });

  it("refuses a quantity that is not a whole number (catches: quantity left unchecked)", () => {
    const draft = createReceiptDraft([ITEM]);
    draft.apply({ group: 1, gtin: GTIN });
    const form = lineForm(lineOf(draft));
    form.rows[0].quantity = "1,5";

    expect(saveLineForm(draft, lineOf(draft), form)).toEqual({ kind: "invalid", message: "Quantité invalide : 1,5" });
    expect(draft.count()).toBe(1);
  });

  it("keeps a quantity typed beyond the one ordered (catches: quantity capped at the ordered one)", () => {
    const draft = createReceiptDraft([ITEM]);
    const form = lineForm(lineOf(draft));
    form.rows.push({ quantity: "7", batchNumber: "", expiration: "" });

    saveLineForm(draft, lineOf(draft), form);

    expect(draft.count()).toBe(7);
  });

  it("drops a batch set to 0 and keeps the others in their order (catches: batch at 0 kept)", () => {
    const draft = createReceiptDraft([ITEM]);
    draft.apply({ group: 1, gtin: GTIN, batchNumber: "L1" });
    draft.apply({ group: 2, gtin: GTIN, batchNumber: "L2" });
    draft.apply({ group: 3, gtin: GTIN, batchNumber: "L3" });
    const form = lineForm(lineOf(draft));
    form.rows[0].quantity = "0";

    saveLineForm(draft, lineOf(draft), form);

    expect(lineOf(draft).batches).toEqual([
      { quantity: 1, batchNumber: "L2" },
      { quantity: 1, batchNumber: "L3" },
    ]);
  });

  it("sends a corrected price and not an unchanged one (catches: price always saved)", () => {
    const unchanged = createReceiptDraft([ITEM]);
    unchanged.apply({ group: 1, gtin: GTIN });
    saveLineForm(unchanged, lineOf(unchanged), lineForm(lineOf(unchanged)));
    const corrected = createReceiptDraft([ITEM]);
    corrected.apply({ group: 1, gtin: GTIN });
    const form = lineForm(lineOf(corrected));
    form.price = "18,40";

    saveLineForm(corrected, lineOf(corrected), form);

    expect(lineForm(lineOf(unchanged)).price).toBe("12,50");
    expect(unchanged.receiveBody().items[0].itemPrice).toBeUndefined();
    expect(corrected.receiveBody().items[0]).toMatchObject({ itemPrice: 18.4, itemTotal: 110.4 });
  });

  it("offers the price only for a line received in this send, and keeps none otherwise (catches: price offered or saved without a quantity)", () => {
    const draft = createReceiptDraft([ITEM]);
    const form = lineForm(lineOf(draft));
    form.rows.push({ quantity: "0", batchNumber: "", expiration: "" });
    form.price = "18,40";
    const offeredAtZero = priceOffered(form);

    saveLineForm(draft, lineOf(draft), form);
    form.rows[0].quantity = "1";

    expect(offeredAtZero).toBe(false);
    expect(lineOf(draft).correctedPrice).toBeUndefined();
    expect(priceOffered(form)).toBe(true);
  });

  it("refuses a price that is not an amount in euros (catches: price left unchecked)", () => {
    const draft = createReceiptDraft([ITEM]);
    draft.apply({ group: 1, gtin: GTIN });
    const form = lineForm(lineOf(draft));
    form.price = "18,4,0";

    expect(saveLineForm(draft, lineOf(draft), form)).toEqual({ kind: "invalid", message: "Prix invalide : 18,4,0" });
    expect(lineOf(draft).correctedPrice).toBeUndefined();
  });

  it("writes the slashes of a typed date and keeps 8 digits (catches: slashes not added, length not capped)", () => {
    expect(maskExpiration("0")).toBe("0");
    expect(maskExpiration("030")).toBe("03/0");
    expect(maskExpiration("03/05/20289")).toBe("03/05/2028");
  });

  it("refuses a quantity above 99 999 (catches: quantity left unbounded)", () => {
    const draft = createReceiptDraft([ITEM]);
    const form = lineForm(lineOf(draft));
    form.rows.push({ quantity: "100000", batchNumber: "", expiration: "" });

    expect(saveLineForm(draft, lineOf(draft), form)).toEqual({ kind: "invalid", message: "Quantité invalide : 100000" });
    expect(draft.count()).toBe(0);
  });

  it("refuses a price of more than 6 digits before the comma (catches: price left unbounded)", () => {
    const draft = createReceiptDraft([ITEM]);
    draft.apply({ group: 1, gtin: GTIN });
    const form = lineForm(lineOf(draft));
    form.price = "1000000";

    expect(saveLineForm(draft, lineOf(draft), form)).toEqual({ kind: "invalid", message: "Prix invalide : 1000000" });
  });

  it("refuses a year outside 2000-2099 (catches: year left unchecked)", () => {
    const draft = createReceiptDraft([ITEM]);
    const form = lineForm(lineOf(draft));
    form.rows.push({ quantity: "1", batchNumber: "", expiration: "01/01/0001" });

    expect(saveLineForm(draft, lineOf(draft), form)).toEqual({
      kind: "invalid",
      message: "Date de péremption impossible : 01/01/0001",
    });
  });

  it("adds up two rows of the same batch and date into one batch (catches: rows kept apart)", () => {
    const draft = createReceiptDraft([ITEM]);
    const form = lineForm(lineOf(draft));
    form.rows.push(
      { quantity: "2", batchNumber: "L1", expiration: "03/05/2028" },
      { quantity: "1", batchNumber: "L2", expiration: "03/05/2028" },
      { quantity: "3", batchNumber: "L1", expiration: "03/05/2028" },
    );

    saveLineForm(draft, lineOf(draft), form);

    expect(lineOf(draft).batches).toEqual([
      { quantity: 5, batchNumber: "L1", expirationDate: "03-05-2028" },
      { quantity: 1, batchNumber: "L2", expirationDate: "03-05-2028" },
    ]);
  });
});
