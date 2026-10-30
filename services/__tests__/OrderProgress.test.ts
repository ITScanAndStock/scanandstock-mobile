import { describe, expect, it } from "vitest";
import type { Order, OrderItem, OrderStatus } from "../../model/Order";
import { isReceivable, orderProgress, receivedRatio, remainingQuantity } from "../OrderProgress";

function item(orderItemId: number, itemDeliveredQuantity: number, itemQuantity: number): OrderItem {
  return { orderItemId, itemProductId: 500, itemProviderId: 3, itemDesignation: "Gants nitrile M", itemQuantity, itemDeliveredQuantity };
}

const LINES = [item(1, 0, 6), item(2, 4, 10), item(3, 20, 20), item(4, 7, 6)];

describe("orderProgress", () => {
  it("sums the received and ordered quantities (catches: lines counted instead of quantities)", () => {
    expect(orderProgress(LINES)).toMatchObject({ received: 31, ordered: 42 });
  });

  it("counts a line received beyond its quantity as finished (catches: finished only on an exact match)", () => {
    expect(orderProgress(LINES)).toMatchObject({ finishedLines: 2, lines: 4 });
  });
});

describe("remainingQuantity", () => {
  it("gives what is left to receive (catches: received quantity shown as the rest)", () => {
    expect(remainingQuantity(item(2, 4, 10))).toBe(6);
  });

  it("never goes below zero on a line received beyond its quantity (catches: negative rest)", () => {
    expect(remainingQuantity(item(4, 7, 6))).toBe(0);
  });
});

describe("receivedRatio", () => {
  it("fills the bar in proportion to what was received (catches: bar filled from the rest)", () => {
    expect(receivedRatio(item(2, 4, 10))).toBe(0.4);
  });

  it("never fills beyond the track on a line received beyond its quantity (catches: ratio not capped at 1)", () => {
    expect(receivedRatio(item(4, 7, 6))).toBe(1);
  });

  it("shows a line ordered at 0 as full (catches: 0 / 0 giving a NaN width)", () => {
    expect(receivedRatio(item(5, 0, 0))).toBe(1);
  });
});

describe("isReceivable", () => {
  const order = (orderStatus: OrderStatus): Order => ({ orderId: 1, orderDate: "2026-10-18 09:05:00+00:00", orderStatus });

  it("offers the reception for an order in progress or partial (catches: one of the two statuses left out)", () => {
    expect(isReceivable(order("pending"))).toBe(true);
    expect(isReceivable(order("partial"))).toBe(true);
  });

  it("does not offer it for a complete or closed order (catches: always receivable)", () => {
    expect(isReceivable(order("complete"))).toBe(false);
    expect(isReceivable(order("closed"))).toBe(false);
  });
});
