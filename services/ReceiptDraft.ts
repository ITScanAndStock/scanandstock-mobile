import type { BatchIdentity } from "../model/Batch";
import type { OrderItem } from "../model/Order";

export type RecognizedCode = {
  group: number;
  gtin?: string;
  batchNumber?: string;
  expirationDate?: string;
  productIds?: readonly number[];
};

export type ExpirationEntry = { day: number; month: number; year: number };

export type BatchEntry = { quantity: number; batchNumber?: string; expiration?: ExpirationEntry };

export type DraftBatch = { quantity: number; batchNumber?: string; expirationDate?: string };

export type DraftLine = { item: OrderItem; deliveredAtStart: number; batches: DraftBatch[]; correctedPrice?: number };

export type ScanOutcome =
  | { kind: "added"; orderItemId: number; batchNumber?: string; expirationDate?: string; merged: boolean }
  | { kind: "lineComplete"; orderItemId: number }
  | { kind: "notInOrder" };

export type DraftMarks = { updatedAt: number | null; uncertainSend: boolean; badgeName: string | null };

export type ReceiveItem = {
  orderItemId: number;
  itemProductId: number;
  itemProviderId: number;
  itemPrice?: number;
  itemTotal?: number;
  batches: DraftBatch[];
};

export type ReceiveBody = { items: ReceiveItem[] };

export type ReceiptDraft = {
  apply: (code: RecognizedCode) => ScanOutcome;
  correctBatch: (orderItemId: number, index: number, entry: BatchEntry) => void;
  addBatch: (orderItemId: number, entry: BatchEntry) => void;
  removeBatch: (orderItemId: number, index: number) => void;
  setPrice: (orderItemId: number, price: number) => void;
  count: () => number;
  receiveBody: () => ReceiveBody;
  reconcile: (reloaded: readonly OrderItem[]) => number[];
  lines: () => DraftLine[];
  marks: () => DraftMarks;
  setMarks: (changes: Partial<DraftMarks>) => void;
};

type LastUnit = { group: number; orderItemId: number; identity: BatchIdentity };

// A GS1 code carries a GTIN-14, the line may carry the EAN-13 of the same product.
const withoutLeadingZeros = (gtin: string) => gtin.replace(/^0+/, "");

const identityOf = ({ batchNumber, expirationDate }: BatchIdentity): BatchIdentity => ({
  batchNumber: batchNumber || undefined,
  expirationDate: expirationDate || undefined,
});

const isBare = (identity: BatchIdentity) => !identity.batchNumber && !identity.expirationDate;

const sameIdentity = (a: BatchIdentity, b: BatchIdentity) =>
  a.batchNumber === b.batchNumber && a.expirationDate === b.expirationDate;

const pad = (value: number, width: number) => String(value).padStart(width, "0");

function formatExpiration({ day, month, year }: ExpirationEntry): string {
  return `${pad(day, 2)}-${pad(month, 2)}-${pad(year, 4)}`;
}

const toBatch = ({ quantity, batchNumber, expiration }: BatchEntry): DraftBatch => ({
  quantity,
  ...identityOf({ batchNumber, expirationDate: expiration && formatExpiration(expiration) }),
});

const freshLine = (item: OrderItem): DraftLine => ({
  item,
  deliveredAtStart: item.itemDeliveredQuantity,
  batches: [],
});

const byOrderItemId = (a: OrderItem, b: OrderItem) => a.orderItemId - b.orderItemId;

const draftQuantity = (line: DraftLine) =>
  line.batches.reduce((sum, batch) => sum + Math.max(0, batch.quantity), 0);

const isComplete = (line: DraftLine) => line.deliveredAtStart + draftQuantity(line) >= line.item.itemQuantity;

const matchesGtin = (line: DraftLine, gtin: string | undefined) =>
  !!gtin && !!line.item.itemGtin && withoutLeadingZeros(line.item.itemGtin) === withoutLeadingZeros(gtin);

const matchesProduct = (line: DraftLine, productIds: readonly number[] | undefined) =>
  !!productIds?.includes(line.item.itemProductId);

function addUnit(line: DraftLine, identity: BatchIdentity) {
  const batch = line.batches.find((candidate) => sameIdentity(candidate, identity));
  if (batch) {
    batch.quantity += 1;
  } else {
    line.batches.push({ quantity: 1, ...identity });
  }
}

function takeUnit(line: DraftLine, identity: BatchIdentity) {
  const index = line.batches.findIndex((candidate) => sameIdentity(candidate, identity));
  if (index >= 0 && --line.batches[index].quantity <= 0) {
    line.batches.splice(index, 1);
  }
}

export function createReceiptDraft(items: readonly OrderItem[]): ReceiptDraft {
  let lines = [...items].sort(byOrderItemId).map(freshLine);
  let lastUnit: LastUnit | null = null;
  let marks: DraftMarks = { updatedAt: null, uncertainSend: false, badgeName: null };

  const lineOf = (orderItemId: number) => {
    const line = lines.find((candidate) => candidate.item.orderItemId === orderItemId);
    if (!line) {
      throw new Error(`No line ${orderItemId} in the receipt draft`);
    }
    return line;
  };

  const editBatches = (orderItemId: number, edit: (batches: DraftBatch[]) => void) => {
    edit(lineOf(orderItemId).batches);
    lastUnit = null;
  };

  const editBatchAt = (orderItemId: number, index: number, edit: (batches: DraftBatch[]) => void) => {
    const { batches } = lineOf(orderItemId);
    if (!Number.isInteger(index) || index < 0 || index >= batches.length) {
      throw new Error(`No batch ${index} on line ${orderItemId} of the receipt draft`);
    }
    editBatches(orderItemId, edit);
  };

  // Two codes that each carry a batch or a date are two units, even with the same batch (serialised products).
  const mergeIntoLastUnit = (code: RecognizedCode, identity: BatchIdentity): ScanOutcome | null => {
    if (!lastUnit || lastUnit.group !== code.group || !(isBare(lastUnit.identity) || isBare(identity))) {
      return null;
    }
    const { orderItemId, identity: counted } = lastUnit;
    const line = lineOf(orderItemId);
    if (!matchesGtin(line, code.gtin) && !matchesProduct(line, code.productIds)) {
      return null;
    }
    const target = isBare(counted) ? identity : counted;
    takeUnit(line, counted);
    addUnit(line, target);
    lastUnit = null;
    return { kind: "added", orderItemId, ...target, merged: true };
  };

  return {
    apply: (code) => {
      const identity = identityOf(code);
      const merged = mergeIntoLastUnit(code, identity);
      if (merged) {
        return merged;
      }

      const byGtin = lines.filter((line) => matchesGtin(line, code.gtin));
      const byProduct = lines.filter((line) => matchesProduct(line, code.productIds));
      const chosen = byGtin.find((line) => !isComplete(line)) ?? byProduct.find((line) => !isComplete(line));
      if (chosen) {
        addUnit(chosen, identity);
        lastUnit = { group: code.group, orderItemId: chosen.item.orderItemId, identity };
        return { kind: "added", orderItemId: chosen.item.orderItemId, ...identity, merged: false };
      }
      const matched = byGtin[0] ?? byProduct[0];
      return matched ? { kind: "lineComplete", orderItemId: matched.item.orderItemId } : { kind: "notInOrder" };
    },
    correctBatch: (orderItemId, index, entry) =>
      editBatchAt(orderItemId, index, (batches) => {
        batches[index] = toBatch(entry);
      }),
    addBatch: (orderItemId, entry) =>
      editBatches(orderItemId, (batches) => {
        batches.push(toBatch(entry));
      }),
    removeBatch: (orderItemId, index) => editBatchAt(orderItemId, index, (batches) => batches.splice(index, 1)),
    setPrice: (orderItemId, price) => {
      lineOf(orderItemId).correctedPrice = price;
    },
    count: () => lines.reduce((sum, line) => sum + draftQuantity(line), 0),
    receiveBody: () => ({
      items: lines.flatMap((line) => {
        const batches = line.batches.filter((batch) => batch.quantity > 0).map((batch) => ({ ...batch }));
        if (batches.length === 0) {
          return [];
        }
        const { orderItemId, itemProductId, itemProviderId, itemQuantity } = line.item;
        const sent: ReceiveItem = { orderItemId, itemProductId, itemProviderId, batches };
        if (line.correctedPrice !== undefined) {
          sent.itemPrice = line.correctedPrice;
          // On the quantity ordered, as the web does; 18.4 × 6 is 110.39999… in floating point.
          sent.itemTotal = Math.round(line.correctedPrice * itemQuantity * 100) / 100;
        }
        return [sent];
      }),
    }),
    reconcile: (reloaded) => {
      const touched: number[] = [];
      const previous = new Map(lines.map((line) => [line.item.orderItemId, line]));
      const next = [...reloaded].sort(byOrderItemId).map((item) => {
        const line = previous.get(item.orderItemId);
        previous.delete(item.orderItemId);
        if (!line) {
          return freshLine(item);
        }
        if (line.deliveredAtStart === item.itemDeliveredQuantity) {
          return { ...line, item };
        }
        if (draftQuantity(line) > 0) {
          touched.push(item.orderItemId);
        }
        return { ...freshLine(item), correctedPrice: line.correctedPrice };
      });
      for (const gone of previous.values()) {
        if (draftQuantity(gone) > 0) {
          touched.push(gone.item.orderItemId);
        }
      }
      lines = next;
      lastUnit = null;
      return touched.sort((a, b) => a - b);
    },
    lines: () => lines.map((line) => ({ ...line, batches: line.batches.map((batch) => ({ ...batch })) })),
    marks: () => ({ ...marks }),
    setMarks: (changes) => {
      marks = { ...marks, ...changes };
    },
  };
}
