import { describe, expect, it, vi } from "vitest";
import type { OrderItem } from "../../model/Order";
import { createReceiptDraft, type ReceiptDraft, type RecognizedCode, restoreReceiptDraft } from "../ReceiptDraft";

const GTIN = "3401234567890";
const OTHER_GTIN = "3409876543210";

function item(orderItemId: number, overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    orderItemId,
    itemProductId: orderItemId * 10,
    itemProviderId: 7,
    itemDesignation: `Produit ${orderItemId}`,
    itemGtin: GTIN,
    itemQuantity: 6,
    itemPrice: 12.5,
    itemDeliveredQuantity: 0,
    ...overrides,
  };
}

let nextGroup = 100;
function code(overrides: Partial<RecognizedCode> = {}): RecognizedCode {
  return { group: ++nextGroup, gtin: GTIN, ...overrides };
}

const L1 = { batchNumber: "L1", expirationDate: "31-03-2028" };
const L2 = { batchNumber: "L2", expirationDate: "31-03-2028" };

function batchesOf(draft: ReceiptDraft, orderItemId: number) {
  return draft.receiveBody().items.find((sent) => sent.orderItemId === orderItemId)?.batches ?? [];
}

describe("ReceiptDraft", () => {
  describe("batches", () => {
    it("adds two scans of the same GTIN, batch and date to one batch of 2 (catches: one batch per scan)", () => {
      const draft = createReceiptDraft([item(1)]);

      draft.apply(code(L1));
      draft.apply(code(L1));

      expect(batchesOf(draft, 1)).toEqual([{ quantity: 2, ...L1 }]);
    });

    it("makes two batches for the same batch number with another date (catches: key on the batch number alone)", () => {
      const draft = createReceiptDraft([item(1)]);

      draft.apply(code(L1));
      draft.apply(code({ batchNumber: "L1", expirationDate: "30-04-2028" }));

      expect(batchesOf(draft, 1)).toEqual([
        { quantity: 1, ...L1 },
        { quantity: 1, batchNumber: "L1", expirationDate: "30-04-2028" },
      ]);
    });

    it("makes two batches for the same date with another batch number (catches: batch number ignored, key on the date alone)", () => {
      const draft = createReceiptDraft([item(1)]);

      draft.apply(code(L1));
      draft.apply(code(L2));

      expect(batchesOf(draft, 1)).toEqual([
        { quantity: 1, ...L1 },
        { quantity: 1, ...L2 },
      ]);
    });

    it("adds codes without batch or date to the line's batch without number (catches: a new empty batch per scan)", () => {
      const draft = createReceiptDraft([item(1)]);

      draft.apply(code());
      draft.apply(code());

      expect(batchesOf(draft, 1)).toEqual([{ quantity: 2 }]);
    });
  });

  describe("line choice", () => {
    it("answers not in the order for a GTIN of no line, and changes nothing (catches: added to the first line)", () => {
      const draft = createReceiptDraft([item(1)]);

      expect(draft.apply(code({ gtin: OTHER_GTIN, productIds: [999] }))).toEqual({ kind: "notInOrder" });
      expect(draft.count()).toBe(0);
    });

    it("matches a GTIN-14 to the line's EAN-13 and an EAN-13 to a line's GTIN-14 (catches: strict comparison)", () => {
      const draft = createReceiptDraft([item(1), item(2, { itemGtin: `0${OTHER_GTIN}` })]);

      expect(draft.apply(code({ gtin: `0${GTIN}` }))).toMatchObject({ kind: "added", orderItemId: 1 });
      expect(draft.apply(code({ gtin: OTHER_GTIN }))).toMatchObject({ kind: "added", orderItemId: 2 });
    });

    it("refuses a scan on a line received 5/6 with 1 in the draft, then takes 2 more typed by hand (catches: guard on the server's received quantity alone, guard applied to typing)", () => {
      const draft = createReceiptDraft([item(1, { itemDeliveredQuantity: 5 })]);
      draft.apply(code());

      expect(draft.apply(code())).toEqual({ kind: "lineComplete", orderItemId: 1 });

      draft.correctBatch(1, 0, { quantity: 3 });
      expect(batchesOf(draft, 1)).toEqual([{ quantity: 3 }]);
    });

    it("sends a scan to the second line of a GTIN when the first is complete (catches: always the first line)", () => {
      const draft = createReceiptDraft([item(1, { itemDeliveredQuantity: 6 }), item(2)]);

      expect(draft.apply(code())).toMatchObject({ kind: "added", orderItemId: 2 });
    });

    it("sends a scan to the smallest orderItemId among open lines of a GTIN, whatever their order (catches: always the last line, order of arrival)", () => {
      const draft = createReceiptDraft([item(20), item(10), item(30)]);

      expect(draft.apply(code())).toMatchObject({ kind: "added", orderItemId: 10 });
    });

    it("takes a line by its product only when no open line has the GTIN (catches: product match weighed with the GTIN match)", () => {
      const draft = createReceiptDraft([item(1, { itemGtin: undefined }), item(2)]);

      expect(draft.apply(code({ productIds: [10] }))).toMatchObject({ kind: "added", orderItemId: 2 });
      expect(draft.apply(code({ gtin: "9999", productIds: [999, 10] }))).toMatchObject({ kind: "added", orderItemId: 1 });
    });

    it("ignores a line without GTIN for a code without GTIN (catches: missing GTINs compared as equal)", () => {
      const draft = createReceiptDraft([item(1, { itemGtin: undefined })]);

      expect(draft.apply(code({ gtin: undefined, productIds: [] }))).toEqual({ kind: "notInOrder" });
    });

    it("answers line complete when the GTIN only matches complete lines and no product matches (catches: complete line read as not in the order)", () => {
      const draft = createReceiptDraft([item(1, { itemDeliveredQuantity: 6 })]);

      expect(draft.apply(code({ productIds: [] }))).toEqual({ kind: "lineComplete", orderItemId: 1 });
    });
  });

  describe("provider choice", () => {
    it("tells when another open line of another provider matched too (catches: providers never compared)", () => {
      const draft = createReceiptDraft([item(1), item(2, { itemProviderId: 8 })]);

      expect(draft.apply(code())).toMatchObject({ kind: "added", orderItemId: 1, providerChoice: true });
    });

    it("tells no choice when the other line is of the same provider (catches: any second open line counted)", () => {
      const draft = createReceiptDraft([item(1), item(2)]);

      expect(draft.apply(code())).toMatchObject({ kind: "added", orderItemId: 1, providerChoice: false });
    });

    it("keeps the provider choice when the second code of the box completes the unit (catches: choice dropped on merge)", () => {
      const draft = createReceiptDraft([item(1), item(2, { itemProviderId: 8 })]);

      draft.apply(code({ group: 1 }));

      expect(draft.apply(code({ group: 1, ...L1 }))).toMatchObject({ merged: true, providerChoice: true });
    });

    it("tells no choice when the other provider's line is complete (catches: complete lines counted)", () => {
      const draft = createReceiptDraft([item(1), item(2, { itemProviderId: 8, itemDeliveredQuantity: 6 })]);

      expect(draft.apply(code())).toMatchObject({ kind: "added", orderItemId: 1, providerChoice: false });
    });
  });

  describe("two codes of one box", () => {
    it("counts an EAN then a GS1 of the same group as 1 unit with the GS1's batch (catches: each code counts)", () => {
      const draft = createReceiptDraft([item(1)]);
      const group = 1;
      draft.apply(code({ group }));

      expect(draft.apply(code({ group, ...L1 }))).toEqual({ kind: "added", orderItemId: 1, ...L1, merged: true, providerChoice: false });
      expect(batchesOf(draft, 1)).toEqual([{ quantity: 1, ...L1 }]);
    });

    it("counts a GS1 (L1) then an EAN of the same group as 1 unit on L1 (catches: merge only when the first code has no batch)", () => {
      const draft = createReceiptDraft([item(1)]);
      draft.apply(code({ group: 1, ...L1 }));

      draft.apply(code({ group: 1 }));

      expect(batchesOf(draft, 1)).toEqual([{ quantity: 1, ...L1 }]);
    });

    it("completes a line 5/6 with an EAN then a GS1 of the same group: 6/6 with the GS1's batch, no line complete (catches: line choice before the merge)", () => {
      const draft = createReceiptDraft([item(1, { itemDeliveredQuantity: 5 })]);
      draft.apply(code({ group: 1 }));

      expect(draft.apply(code({ group: 1, ...L1 }))).toMatchObject({ kind: "added", orderItemId: 1 });
      expect(batchesOf(draft, 1)).toEqual([{ quantity: 1, ...L1 }]);
    });

    it("merges a second code found by its product on the first code's line (catches: merge looked up by GTIN only)", () => {
      const draft = createReceiptDraft([item(1, { itemDeliveredQuantity: 5 })]);
      draft.apply(code({ group: 1 }));

      expect(draft.apply(code({ group: 1, gtin: "9999", productIds: [10], ...L1 }))).toMatchObject({ merged: true });
      expect(batchesOf(draft, 1)).toEqual([{ quantity: 1, ...L1 }]);
    });

    it("counts an EAN and a GS1 of two groups as 2 units (catches: group ignored)", () => {
      const draft = createReceiptDraft([item(1)]);
      draft.apply(code({ group: 1 }));

      draft.apply(code({ group: 2, ...L1 }));

      expect(draft.count()).toBe(2);
    });

    it("counts two GS1 of the same group, L1 then L2, as 2 units (catches: every second code of a group merged)", () => {
      const draft = createReceiptDraft([item(1)]);
      draft.apply(code({ group: 1, ...L1 }));

      draft.apply(code({ group: 1, ...L2 }));

      expect(draft.count()).toBe(2);
    });

    it("counts two GS1 of the same group and the same batch as 2 units (catches: merge on an equal batch)", () => {
      const draft = createReceiptDraft([item(1)]);
      draft.apply(code({ group: 1, ...L1 }));

      draft.apply(code({ group: 1, ...L1 }));

      expect(batchesOf(draft, 1)).toEqual([{ quantity: 2, ...L1 }]);
    });

    it("counts a third code of the group as a unit: EAN, GS1, EAN make 2, next to an earlier box (catches: the group keeps merging)", () => {
      const draft = createReceiptDraft([item(1)]);
      draft.apply(code());
      draft.apply(code({ group: 1 }));
      draft.apply(code({ group: 1, ...L1 }));

      draft.apply(code({ group: 1 }));

      expect(batchesOf(draft, 1)).toEqual([{ quantity: 2 }, { quantity: 1, ...L1 }]);
    });

    it("does not merge into a unit edited by hand since (catches: the last unit kept across a correction)", () => {
      const draft = createReceiptDraft([item(1)]);
      draft.apply(code({ group: 1 }));
      draft.correctBatch(1, 0, { quantity: 3 });

      draft.apply(code({ group: 1, ...L1 }));

      expect(batchesOf(draft, 1)).toEqual([{ quantity: 3 }, { quantity: 1, ...L1 }]);
    });
  });

  describe("receive body", () => {
    it("sends no line and no batch at 0, and at least one batch per line sent (catches: filter removed, empty batches allowed)", () => {
      const draft = createReceiptDraft([item(1), item(2, { itemGtin: OTHER_GTIN }), item(3)]);
      draft.apply(code(L1));
      draft.addBatch(1, { quantity: 0, batchNumber: "L0" });
      draft.addBatch(2, { quantity: 0 });

      expect(draft.receiveBody()).toEqual({
        items: [{ orderItemId: 1, itemProductId: 10, itemProviderId: 7, batches: [{ quantity: 1, ...L1 }] }],
      });
    });

    it("sends itemPrice and itemTotal only for a line whose price was corrected (catches: price always sent)", () => {
      const draft = createReceiptDraft([item(1), item(2)]);
      draft.apply(code());
      draft.apply(code({ gtin: undefined, productIds: [20] }));
      draft.setPrice(2, 14);

      const [first, second] = draft.receiveBody().items;
      expect(first).not.toHaveProperty("itemPrice");
      expect(first).not.toHaveProperty("itemTotal");
      expect(second).toMatchObject({ itemPrice: 14 });
    });

    it("sends a typed expiration as dd-MM-yyyy (catches: ISO format)", () => {
      const draft = createReceiptDraft([item(1)]);

      draft.addBatch(1, { quantity: 1, batchNumber: "L3", expiration: { day: 5, month: 3, year: 2028 } });

      expect(batchesOf(draft, 1)).toEqual([{ quantity: 1, batchNumber: "L3", expirationDate: "05-03-2028" }]);
    });

    it("removes a batch from a line (catches: removal ignored)", () => {
      const draft = createReceiptDraft([item(1)]);
      draft.apply(code(L1));
      draft.apply(code(L2));

      draft.removeBatch(1, 0);

      expect(batchesOf(draft, 1)).toEqual([{ quantity: 1, ...L2 }]);
    });

    it("refuses to correct or remove a batch the line does not have (catches: index not checked, splice(-1) removing the last batch)", () => {
      const draft = createReceiptDraft([item(1)]);
      draft.apply(code(L1));
      draft.apply(code(L2));

      expect(() => draft.removeBatch(1, -1)).toThrow();
      expect(() => draft.correctBatch(1, 2, { quantity: 1 })).toThrow();
      expect(batchesOf(draft, 1)).toEqual([
        { quantity: 1, ...L1 },
        { quantity: 1, ...L2 },
      ]);
    });

    it("totals 18.40 € over 6 ordered with 2 received as 110.40 (catches: total on the received quantity, total not rounded)", () => {
      const draft = createReceiptDraft([item(1)]);
      draft.apply(code());
      draft.apply(code());

      draft.setPrice(1, 18.4);

      expect(draft.receiveBody().items[0]).toMatchObject({ itemPrice: 18.4, itemTotal: 110.4 });
    });

    it("counts 4 products for a line with batches of 2 and 1 and a line with one batch of 1 (catches: number of lines, number of batches)", () => {
      const draft = createReceiptDraft([item(1), item(2, { itemGtin: OTHER_GTIN })]);
      draft.apply(code(L1));
      draft.apply(code(L1));
      draft.apply(code(L2));
      draft.apply(code({ gtin: OTHER_GTIN }));

      expect(draft.count()).toBe(4);
    });
  });

  describe("reading again against reloaded lines", () => {
    it("drops the batches of a line whose received quantity changed, and only those (catches: guard removed, whole draft dropped)", () => {
      const draft = createReceiptDraft([item(1), item(2, { itemGtin: OTHER_GTIN })]);
      draft.apply(code());
      draft.apply(code({ gtin: OTHER_GTIN }));

      const touched = draft.reconcile([item(1, { itemDeliveredQuantity: 2 }), item(2, { itemGtin: OTHER_GTIN })]);

      expect(touched).toEqual([1]);
      expect(draft.receiveBody().items.map((sent) => sent.orderItemId)).toEqual([2]);
    });

    it("keeps the corrected price of a line whose batches were dropped (catches: price dropped with the batches)", () => {
      const draft = createReceiptDraft([item(1)]);
      draft.apply(code());
      draft.setPrice(1, 14);

      draft.reconcile([item(1, { itemDeliveredQuantity: 2 })]);
      draft.apply(code());

      expect(draft.receiveBody().items[0]).toMatchObject({ itemPrice: 14 });
    });

    it("counts a code of the last unit's group after that unit's line disappeared (catches: the last unit kept across a reload)", () => {
      const draft = createReceiptDraft([item(1, { itemGtin: OTHER_GTIN }), item(2)]);
      draft.apply(code({ group: 1 }));

      draft.reconcile([item(1, { itemGtin: OTHER_GTIN })]);

      expect(draft.apply(code({ group: 1, gtin: OTHER_GTIN, ...L1 }))).toMatchObject({ kind: "added", merged: false });
    });

    it("drops only the batches of a line that disappeared (catches: whole draft dropped)", () => {
      const draft = createReceiptDraft([item(1), item(2, { itemGtin: OTHER_GTIN })]);
      draft.apply(code());
      draft.apply(code({ gtin: OTHER_GTIN }));

      const touched = draft.reconcile([item(1)]);

      expect(touched).toEqual([2]);
      expect(draft.lines().map((line) => line.item.orderItemId)).toEqual([1]);
      expect(batchesOf(draft, 1)).toEqual([{ quantity: 1 }]);
    });

    it("guards the next scan with the reloaded received quantity (catches: quantity at start kept from before)", () => {
      const draft = createReceiptDraft([item(1, { itemDeliveredQuantity: 4 })]);

      draft.reconcile([item(1, { itemDeliveredQuantity: 6 })]);

      expect(draft.apply(code())).toEqual({ kind: "lineComplete", orderItemId: 1 });
    });
  });

  describe("marks", () => {
    it("starts with no modification date, no uncertain send and no badge, and keeps what is set (catches: setMarks ignores its changes)", () => {
      const draft = createReceiptDraft([item(1)]);
      expect(draft.marks()).toEqual({ updatedAt: null, uncertainSend: false, badgeScan: null, badgeName: null });

      draft.setMarks({ updatedAt: 1_700_000_000_000, uncertainSend: true, badgeScan: "B-7", badgeName: "Julie" });

      expect(draft.marks()).toEqual({ updatedAt: 1_700_000_000_000, uncertainSend: true, badgeScan: "B-7", badgeName: "Julie" });
    });
  });

  describe("restoring a saved draft", () => {
    it("drops the scans of a line received elsewhere since the draft was saved (catches: saved lines restored without reading them again)", () => {
      const draft = createReceiptDraft([item(1), item(2, { itemGtin: OTHER_GTIN })]);
      draft.apply(code());
      draft.apply(code({ gtin: OTHER_GTIN }));

      const { draft: restored, touched } = restoreReceiptDraft(draft.snapshot(), [
        item(1, { itemDeliveredQuantity: 3 }),
        item(2, { itemGtin: OTHER_GTIN }),
      ]);

      expect(touched).toEqual([1]);
      expect(restored.receiveBody().items.map((sent) => sent.orderItemId)).toEqual([2]);
    });

    it("leaves the saved draft untouched by the restored one (catches: saved lines shared with the restored draft)", () => {
      const draft = createReceiptDraft([item(1)]);
      draft.apply(code());
      const saved = draft.snapshot();

      restoreReceiptDraft(saved, [item(1)]).draft.apply(code());

      expect(saved.lines[0].batches).toEqual([{ quantity: 1 }]);
    });
  });

  describe("starting again", () => {
    it("drops every scan and correction but keeps the marks (catches: batches kept; uncertain send forgotten; last unit kept)", () => {
      const draft = createReceiptDraft([item(1), item(2, { itemGtin: OTHER_GTIN })]);
      draft.addBatch(2, { quantity: 2 });
      draft.apply(code({ group: 1, ...L1 }));
      draft.setMarks({ uncertainSend: true, badgeName: "Julie" });

      draft.restart();

      expect(draft.count()).toBe(0);
      expect(draft.marks()).toMatchObject({ uncertainSend: true, badgeName: "Julie" });
      expect(draft.apply(code({ group: 1, gtin: GTIN }))).toMatchObject({ kind: "added", merged: false });
    });
  });

  describe("change notifications", () => {
    it("notifies once per change and not for a refused code (catches: a kind of change not notified; a refused code notified)", () => {
      const draft = createReceiptDraft([item(1)]);
      const listener = vi.fn();
      const unsubscribe = draft.subscribe(listener);

      draft.apply(code());
      draft.apply(code({ gtin: OTHER_GTIN }));
      draft.correctBatch(1, 0, { quantity: 2 });
      draft.addBatch(1, { quantity: 1, batchNumber: "L9" });
      draft.removeBatch(1, 1);
      draft.setPrice(1, 14);
      draft.setMarks({ badgeName: "Julie" });
      draft.reconcile([item(1)]);
      draft.restart();
      expect(listener).toHaveBeenCalledTimes(8);

      unsubscribe();
      draft.apply(code());
      expect(listener).toHaveBeenCalledTimes(8);
    });
  });
});
