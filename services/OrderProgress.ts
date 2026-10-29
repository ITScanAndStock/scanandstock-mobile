import type { OrderItem } from "../model/Order";

export type OrderProgress = { received: number; ordered: number; finishedLines: number; lines: number };

export function remainingQuantity(item: OrderItem): number {
  return Math.max(0, item.itemQuantity - item.itemDeliveredQuantity);
}

export function receivedRatio(item: OrderItem): number {
  return item.itemQuantity > 0 ? Math.min(1, item.itemDeliveredQuantity / item.itemQuantity) : 1;
}

export function orderProgress(items: readonly OrderItem[]): OrderProgress {
  return {
    received: items.reduce((sum, item) => sum + item.itemDeliveredQuantity, 0),
    ordered: items.reduce((sum, item) => sum + item.itemQuantity, 0),
    finishedLines: items.filter((item) => remainingQuantity(item) === 0).length,
    lines: items.length,
  };
}
