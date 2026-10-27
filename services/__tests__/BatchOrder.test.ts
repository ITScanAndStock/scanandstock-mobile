import { describe, expect, it } from "vitest";
import { Batch } from "../../model/Batch";
import { orderBatches } from "../BatchOrder";

function batch(stockDetailsId: number, expirationDate?: string, batchNumber?: string): Batch {
  return { stockDetailsId, quantity: 1, batchNumber, expirationDate };
}

const dates = (batches: Batch[]) => batches.map((b) => b.expirationDate ?? "sans date");

describe("orderBatches", () => {
  const shuffled = [
    batch(1, "01-12-2027", "L1"),
    batch(2, undefined, "L2"),
    batch(3, "15-03-2027", "L3"),
    batch(4, "02-01-2027", "L4"),
    batch(5, "01-02-2027", "L5"),
  ];

  it("orders by expiration date, undated batches last (catches: sort on the text, day and month swapped, API order kept, undated not pushed back)", () => {
    expect(dates(orderBatches(shuffled))).toEqual(["02-01-2027", "01-02-2027", "15-03-2027", "01-12-2027", "sans date"]);
  });

  it("puts the remembered batch first, recognised by number and date under a new stockDetailsId (catches: remembered batch ignored, recognised by stockDetailsId)", () => {
    const remembered = { batchNumber: "L3", expirationDate: "15-03-2027" };
    const nextList = [batch(13, "15-03-2027", "L3"), batch(4, "02-01-2027", "L4"), batch(3, "01-12-2027", "L1")];

    expect(orderBatches(nextList, remembered).map((b) => b.stockDetailsId)).toEqual([13, 4, 3]);
  });

  it("recognises a dated remembered batch without number next to another one without number (catches: recognised by number alone)", () => {
    const remembered = { expirationDate: "01-12-2027" };
    const list = [batch(7, "02-01-2027"), batch(8, "01-12-2027")];

    expect(orderBatches(list, remembered).map((b) => b.stockDetailsId)).toEqual([8, 7]);
  });

  it("takes the first matching row when the same batch comes twice (catches: last matching row taken)", () => {
    const remembered = { batchNumber: "L9", expirationDate: "01-12-2027" };
    const list = [batch(1, "02-01-2027", "L1"), batch(20, "01-12-2027", "L9"), batch(21, "01-12-2027", "L9")];

    expect(orderBatches(list, remembered).map((b) => b.stockDetailsId)).toEqual([20, 1, 21]);
  });
});
