import AsyncStorage from "@react-native-async-storage/async-storage";
import type { OrderItem } from "../model/Order";
import { readAccessToken } from "./AccessToken";
import type { OrdersToReceive } from "./OrderService";
import { createReceiptDraft, type DraftSnapshot, type ReceiptDraft, restoreReceiptDraft } from "./ReceiptDraft";
import { MAX_PRICE, MAX_QUANTITY } from "./ReceiptLineEdit";
import SecureStorageService from "./SecureStorageService";

// Not in the list cleared by AuthService.logout: a draft outlives the automatic logout.
const KEY_PREFIX = "receipt-draft:";

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export type DraftOwner = { email: string; accountId: string; orderId: number };

// key is null without an email claim, or when the stored draft could not be read: the draft then stays in memory.
export type SavedReceiptDraft = { key: string | null; saved: DraftSnapshot | null };

export type OpenedReceiptDraft = { draft: ReceiptDraft; touched: number; forget: () => void };

type Fields = { [field: string]: unknown };

const isRecord = (value: unknown): value is Fields => typeof value === "object" && value !== null;
const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isOptional = (value: unknown, check: (value: unknown) => boolean) => value === undefined || check(value);
const isString = (value: unknown) => typeof value === "string";
const isNullable = (value: unknown, check: (value: unknown) => boolean) => value === null || check(value);

// The bounds of the line sheet: a stored draft goes into the receipt body like a typed one.
const isBatch = (value: unknown) =>
  isRecord(value) &&
  Number.isInteger(value.quantity) &&
  (value.quantity as number) >= 0 &&
  (value.quantity as number) <= MAX_QUANTITY &&
  isOptional(value.batchNumber, isString) &&
  isOptional(value.expirationDate, isString);

const isPrice = (value: unknown) => isNumber(value) && value >= 0 && value <= MAX_PRICE;

const isItem = (value: unknown) =>
  isRecord(value) &&
  ["orderItemId", "itemProductId", "itemProviderId", "itemQuantity", "itemDeliveredQuantity"].every((field) =>
    isNumber(value[field]),
  ) &&
  isString(value.itemDesignation);

const isLine = (value: unknown) =>
  isRecord(value) &&
  isItem(value.item) &&
  isNumber(value.deliveredAtStart) &&
  Array.isArray(value.batches) &&
  value.batches.every(isBatch) &&
  isOptional(value.correctedPrice, isPrice);

const isMarks = (value: unknown) =>
  isRecord(value) &&
  isNullable(value.updatedAt, isNumber) &&
  typeof value.uncertainSend === "boolean" &&
  isNullable(value.badgeScan, isString) &&
  isNullable(value.badgeName, isString);

function parseDraft(text: string): DraftSnapshot | null {
  try {
    const value: unknown = JSON.parse(text);
    return isRecord(value) && Array.isArray(value.lines) && value.lines.every(isLine) && isMarks(value.marks)
      ? (value as DraftSnapshot)
      : null;
  } catch {
    return null;
  }
}

const isEmpty = ({ lines, marks }: DraftSnapshot) =>
  !marks.uncertainSend && lines.every((line) => line.batches.length === 0 && line.correctedPrice === undefined);

function logError(message: string, error: unknown) {
  if (__DEV__) {
    console.error(`❌ ${message}`, error);
  }
}

// String(): the API sends account ids as numbers, typed string in model/Account.ts; ownerOf reads them back as strings.
export function receiptDraftKey({ email, accountId, orderId }: DraftOwner): string {
  return KEY_PREFIX + JSON.stringify([email, String(accountId), orderId]);
}

function ownerOf(key: string): DraftOwner | null {
  try {
    const [email, accountId, orderId]: unknown[] = JSON.parse(key.slice(KEY_PREFIX.length));
    return typeof email === "string" && typeof accountId === "string" && isNumber(orderId)
      ? { email, accountId, orderId }
      : null;
  } catch {
    return null;
  }
}

async function readTokenEmail(): Promise<string | null> {
  return readAccessToken(await SecureStorageService.getToken())?.email ?? null;
}

export async function readReceiptDraft(key: string): Promise<DraftSnapshot | null> {
  const text = await AsyncStorage.getItem(key);
  return text ? parseDraft(text) : null;
}

export async function loadReceiptDraft(accountId: string, orderId: number): Promise<SavedReceiptDraft> {
  const email = await readTokenEmail();
  if (!email) {
    return { key: null, saved: null };
  }
  const key = receiptDraftKey({ email, accountId, orderId });
  try {
    return { key, saved: await readReceiptDraft(key) };
  } catch (error) {
    logError("Erreur de lecture du brouillon de réception", error);
    return { key: null, saved: null };
  }
}

export function createDraftSaver(key: string, now: () => number) {
  let cleared = false;
  // Chained: a removal must not be overtaken by a write still on its way.
  let queue = Promise.resolve();
  const enqueue = (write: () => Promise<void>) => {
    queue = queue.then(write).catch((error) => logError("Erreur d'enregistrement du brouillon de réception", error));
  };

  return {
    save: (snapshot: DraftSnapshot) => {
      if (cleared) {
        return;
      }
      if (isEmpty(snapshot)) {
        enqueue(() => AsyncStorage.removeItem(key));
        return;
      }
      const text = JSON.stringify({ ...snapshot, marks: { ...snapshot.marks, updatedAt: now() } });
      enqueue(() => AsyncStorage.setItem(key, text));
    },
    clear: () => {
      cleared = true;
      enqueue(() => AsyncStorage.removeItem(key));
    },
  };
}

export function openReceiptDraft(
  { key, saved }: SavedReceiptDraft,
  items: readonly OrderItem[],
  now: () => number,
): OpenedReceiptDraft {
  const restored = saved ? restoreReceiptDraft(saved, items) : null;
  const draft = restored?.draft ?? createReceiptDraft(items);
  const touched = restored?.touched.length ?? 0;
  // An order served without its lines would empty the saved draft: it stays as it was.
  if (!key || items.length === 0) {
    return { draft, touched, forget: () => {} };
  }
  const saver = createDraftSaver(key, now);
  draft.subscribe(() => saver.save(draft.snapshot()));
  if (touched > 0) {
    saver.save(draft.snapshot());
  }
  return { draft, touched, forget: saver.clear };
}

// Without a complete list of orders to receive, an order missing from it may still be open: its draft stays.
export async function pruneReceiptDrafts(now: number, accountId: string, toReceive?: OrdersToReceive): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(KEY_PREFIX));
    if (keys.length === 0) {
      return;
    }
    const email = toReceive?.complete ? await readTokenEmail() : null;
    const listed = new Set(toReceive?.orders.map((order) => order.orderId));
    const stale = (await AsyncStorage.multiGet(keys))
      .filter(([key, text]) => {
        const owner = ownerOf(key);
        const draft = text ? parseDraft(text) : null;
        if (!owner || !draft || draft.marks.updatedAt === null || now - draft.marks.updatedAt > MAX_AGE_MS) {
          return true;
        }
        return owner.email === email && owner.accountId === String(accountId) && !listed.has(owner.orderId);
      })
      .map(([key]) => key);
    if (stale.length > 0) {
      await AsyncStorage.multiRemove(stale);
    }
  } catch (error) {
    logError("Erreur au nettoyage des brouillons de réception", error);
  }
}
