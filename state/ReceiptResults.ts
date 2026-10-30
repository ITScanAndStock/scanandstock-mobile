import type { ReceiptResult } from "@/services/ReceiptResult";

const resultsByOrder = new Map<string, ReceiptResult>();

const keyOf = (accountId: string, orderId: number) => `${accountId}:${orderId}`;

const ReceiptResults = {
  remember(accountId: string, orderId: number, result: ReceiptResult) {
    resultsByOrder.set(keyOf(accountId, orderId), result);
  },
  get(accountId: string, orderId: number) {
    return resultsByOrder.get(keyOf(accountId, orderId));
  },
};

export default ReceiptResults;
