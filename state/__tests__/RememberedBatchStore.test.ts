import { beforeEach, describe, expect, it } from "vitest";
import RememberedBatchStore from "../RememberedBatchStore";

const chosen = { stockDetailsId: 3, quantity: 2, batchNumber: "L3", expirationDate: "15-03-2027" };

describe("RememberedBatchStore", () => {
  beforeEach(() => {
    RememberedBatchStore.forgetAll();
  });

  it("remembers the chosen batch by number and date, without its stockDetailsId (catches: chosen batch not remembered, stockDetailsId kept)", () => {
    RememberedBatchStore.remember(42, chosen);

    expect(RememberedBatchStore.get(42)).toEqual({ batchNumber: "L3", expirationDate: "15-03-2027" });
  });

  it("keeps one batch per product (catches: a single batch kept for every product)", () => {
    RememberedBatchStore.remember(42, chosen);
    RememberedBatchStore.remember(7, { batchNumber: "L5", expirationDate: "01-02-2027" });

    expect(RememberedBatchStore.get(42)).toEqual({ batchNumber: "L3", expirationDate: "15-03-2027" });
    expect(RememberedBatchStore.get(7)).toEqual({ batchNumber: "L5", expirationDate: "01-02-2027" });
  });

  it("forgets every product at once (catches: forgetAll that keeps the batches)", () => {
    RememberedBatchStore.remember(42, chosen);
    RememberedBatchStore.remember(7, { batchNumber: "L5", expirationDate: "01-02-2027" });

    RememberedBatchStore.forgetAll();

    expect(RememberedBatchStore.get(42)).toBeUndefined();
    expect(RememberedBatchStore.get(7)).toBeUndefined();
  });
});
