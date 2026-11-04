import { type DraftLine, draftQuantity } from "./ReceiptDraft";

type ReceivedLine = { orderItemId: number; designation: string; quantity: number; over: number };

type RemainingLine = Omit<ReceivedLine, "over">;

export type ReceiptResult = { entered: number; received: ReceivedLine[]; remaining: RemainingLine[] };

export function receiptResult(lines: readonly DraftLine[]): ReceiptResult {
  const received: ReceivedLine[] = [];
  const remaining: RemainingLine[] = [];
  for (const line of lines) {
    const { orderItemId, itemDesignation: designation, itemQuantity } = line.item;
    const quantity = draftQuantity(line);
    const total = line.deliveredAtStart + quantity;
    if (quantity > 0) {
      received.push({ orderItemId, designation, quantity, over: Math.min(quantity, Math.max(0, total - itemQuantity)) });
    }
    if (total < itemQuantity) {
      remaining.push({ orderItemId, designation, quantity: itemQuantity - total });
    }
  }
  return { entered: received.reduce((sum, line) => sum + line.quantity, 0), received, remaining };
}
