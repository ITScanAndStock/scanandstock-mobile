import { fullExpiration } from "./ReceiptBanner";
import type { BatchEntry, DraftLine, ExpirationEntry, ReceiptDraft } from "./ReceiptDraft";

export type LineFormRow = { quantity: string; batchNumber: string; expiration: string };

export type LineForm = { rows: LineFormRow[]; price: string };

export type LineFormSave = { kind: "saved" } | { kind: "invalid"; message: string };

type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };

const EXPIRATION_DIGITS = 8;
export const MAX_QUANTITY = 99999;

// The most the price field takes: six digits and two decimals.
export const MAX_PRICE = 999999.99;

export function maskExpiration(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, EXPIRATION_DIGITS);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join("/");
}

function parseExpiration(text: string): Parsed<ExpirationEntry | undefined> {
  if (text === "") {
    return { ok: true, value: undefined };
  }
  const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  const [day, month, year] = parts ? parts.slice(1).map(Number) : [];
  const date = new Date(Date.UTC(year, month - 1, day));
  // The API decodes GS1 dates in this century, and Date.UTC would read years 0 to 99 as 1900 to 1999.
  if (!parts || year < 2000 || year > 2099 || date.getUTCDate() !== day || date.getUTCMonth() !== month - 1) {
    return { ok: false, message: `Date de péremption impossible : ${text}` };
  }
  return { ok: true, value: { day, month, year } };
}

function parseQuantity(text: string): Parsed<number> {
  return /^\d+$/.test(text) && Number(text) <= MAX_QUANTITY
    ? { ok: true, value: Number(text) }
    : { ok: false, message: `Quantité invalide : ${text}` };
}

function parsePrice(text: string): Parsed<number | undefined> {
  if (text === "") {
    return { ok: true, value: undefined };
  }
  return /^\d{1,6}(?:[.,]\d{1,2})?$/.test(text)
    ? { ok: true, value: Number(text.replace(",", ".")) }
    : { ok: false, message: `Prix invalide : ${text}` };
}

const priceInput = (price: number | undefined) => (price === undefined ? "" : price.toFixed(2).replace(".", ","));

const currentPrice = (line: DraftLine) => line.correctedPrice ?? line.item.itemPrice;

export function lineForm(line: DraftLine): LineForm {
  return {
    rows: line.batches.map((batch) => ({
      quantity: String(batch.quantity),
      batchNumber: batch.batchNumber ?? "",
      expiration: batch.expirationDate ? fullExpiration(batch.expirationDate) : "",
    })),
    price: priceInput(currentPrice(line)),
  };
}

// A corrected price only leaves with a line received in the same send.
export const priceOffered = (form: LineForm) =>
  form.rows.some((row) => {
    const quantity = parseQuantity(row.quantity.trim());
    return quantity.ok && quantity.value > 0;
  });

const sameEntry = (a: BatchEntry, b: BatchEntry) =>
  a.batchNumber === b.batchNumber &&
  a.expiration?.day === b.expiration?.day &&
  a.expiration?.month === b.expiration?.month &&
  a.expiration?.year === b.expiration?.year;

export function saveLineForm(draft: ReceiptDraft, line: DraftLine, form: LineForm): LineFormSave {
  const entries: BatchEntry[] = [];
  for (const row of form.rows) {
    const quantity = parseQuantity(row.quantity.trim());
    if (!quantity.ok) {
      return { kind: "invalid", message: quantity.message };
    }
    const expiration = parseExpiration(row.expiration.trim());
    if (!expiration.ok) {
      return { kind: "invalid", message: expiration.message };
    }
    const entry = { quantity: quantity.value, batchNumber: row.batchNumber.trim(), expiration: expiration.value };
    const same = entries.find((candidate) => sameEntry(candidate, entry));
    if (same) {
      same.quantity += entry.quantity;
    } else if (entry.quantity > 0) {
      entries.push(entry);
    }
  }
  const price = parsePrice(priceOffered(form) ? form.price.trim() : "");
  if (!price.ok) {
    return { kind: "invalid", message: price.message };
  }

  const { orderItemId } = line.item;
  const kept = line.batches.length;
  for (let index = kept - 1; index >= entries.length; index -= 1) {
    draft.removeBatch(orderItemId, index);
  }
  entries.forEach((entry, index) =>
    index < kept ? draft.correctBatch(orderItemId, index, entry) : draft.addBatch(orderItemId, entry),
  );
  if (price.value !== undefined && price.value !== currentPrice(line)) {
    draft.setPrice(orderItemId, price.value);
  }
  return { kind: "saved" };
}
