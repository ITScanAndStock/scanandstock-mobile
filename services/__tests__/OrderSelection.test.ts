import { describe, expect, it } from "vitest";
import type { Order } from "../../model/Order";
import { shownOrder } from "../OrderSelection";

function order(orderId: number): Order {
  return { orderId, orderDate: "2026-10-18 09:05:00+00:00", orderStatus: "pending" };
}

const SHOWN = [order(30), order(20), order(10)];

describe("shownOrder", () => {
  it("opens the first order of the list when none was chosen (catches: no default, or the last one)", () => {
    expect(shownOrder(undefined, SHOWN)?.orderId).toBe(30);
  });

  it("keeps the order chosen in the list (catches: chosen order ignored)", () => {
    expect(shownOrder(20, SHOWN)?.orderId).toBe(20);
  });

  it("opens the first order when the chosen one is not in the shown list (catches: choice kept outside the list)", () => {
    expect(shownOrder(99, SHOWN)?.orderId).toBe(30);
  });

  it("opens nothing while the list is loading (catches: first order read from a missing list)", () => {
    expect(shownOrder(undefined, undefined)).toBeUndefined();
  });
});
