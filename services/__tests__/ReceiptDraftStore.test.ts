import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order, OrderItem } from "../../model/Order";
import { createReceiptDraft, type DraftSnapshot, restoreReceiptDraft } from "../ReceiptDraft";
import {
  createDraftSaver,
  type DraftOwner,
  openReceiptDraft,
  pruneReceiptDrafts,
  readReceiptDraft,
  receiptDraftKey,
} from "../ReceiptDraftStore";

const asyncStore = new Map<string, string>();
const secureStore = new Map<string, string>();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    setItem: async (key: string, value: string) => {
      asyncStore.set(key, value);
    },
    getItem: async (key: string) => asyncStore.get(key) ?? null,
    removeItem: async (key: string) => {
      asyncStore.delete(key);
    },
    getAllKeys: async () => [...asyncStore.keys()],
    multiGet: async (keys: string[]) => keys.map((key) => [key, asyncStore.get(key) ?? null]),
    multiRemove: async (keys: string[]) => {
      keys.forEach((key) => asyncStore.delete(key));
    },
  },
}));

vi.mock("expo-secure-store", () => ({
  getItemAsync: async (key: string) => secureStore.get(key) ?? null,
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

const GTIN = "3401234567890";
const OTHER_GTIN = "3409876543210";

function item(orderItemId: number, overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    orderItemId,
    itemProductId: orderItemId * 10,
    itemProviderId: 7,
    itemDesignation: `Produit ${orderItemId}`,
    itemGtin: GTIN,
    itemQuantity: 6,
    itemPrice: 12.5,
    itemDeliveredQuantity: 0,
    ...overrides,
  };
}

function token(email: string): string {
  const part = (json: object) => Buffer.from(JSON.stringify(json)).toString("base64url");
  return `${part({ alg: "RS256" })}.${part({ email, realm_access: { roles: [] } })}.signature`;
}

const JULIE: DraftOwner = { email: "julie@cabinet.fr", accountId: "12", orderId: 5 };

async function saveDraftAt(owner: DraftOwner, savedAt: number) {
  const draft = createReceiptDraft([item(1)]);
  draft.apply({ group: 1, gtin: GTIN });
  createDraftSaver(receiptDraftKey(owner), () => savedAt).save(draft.snapshot());
  await flush();
}

function toReceive(orderIds: number[], complete = true) {
  const orders: Order[] = orderIds.map((orderId) => ({ orderId, orderDate: "2026-10-20 08:00:00+00:00", orderStatus: "pending" }));
  return { orders, count: orders.length, complete };
}

const stored = (owner: DraftOwner) => asyncStore.has(receiptDraftKey(owner));

describe("ReceiptDraftStore", () => {
  beforeEach(() => {
    asyncStore.clear();
    secureStore.clear();
    secureStore.set("token", token(JULIE.email));
  });

  describe("saving and reading", () => {
    it("reads back a full draft into the same body and marks (catches: a field forgotten, quantity at start not saved, decoded date reformatted)", async () => {
      const items = [item(1, { itemDeliveredQuantity: 2 }), item(2, { itemGtin: OTHER_GTIN })];
      const draft = createReceiptDraft(items);
      draft.apply({ group: 1, gtin: GTIN, batchNumber: "LT2291", expirationDate: "31-03-2028" });
      draft.apply({ group: 2, gtin: GTIN, batchNumber: "LT2291", expirationDate: "31-03-2028" });
      draft.apply({ group: 3, gtin: GTIN });
      draft.addBatch(2, { quantity: 3, batchNumber: "B7", expiration: { day: 1, month: 2, year: 2029 } });
      draft.setPrice(2, 18.4);
      draft.setMarks({ uncertainSend: true, badgeScan: "BADGE-7", badgeName: "Julie" });
      createDraftSaver(receiptDraftKey(JULIE), () => NOW).save(draft.snapshot());
      await flush();

      const saved = await readReceiptDraft(receiptDraftKey(JULIE));
      const { draft: restored, touched } = restoreReceiptDraft(saved!, items);

      expect(touched).toEqual([]);
      expect(restored.receiveBody()).toEqual(draft.receiveBody());
      expect(restored.receiveBody().items[0].batches).toEqual([
        { quantity: 2, batchNumber: "LT2291", expirationDate: "31-03-2028" },
        { quantity: 1 },
      ]);
      expect(restored.marks()).toEqual({ updatedAt: NOW, uncertainSend: true, badgeScan: "BADGE-7", badgeName: "Julie" });
      expect(restored.apply({ group: 4, gtin: GTIN, batchNumber: "X" })).toMatchObject({ kind: "added", orderItemId: 1 });
      expect(restored.apply({ group: 5, gtin: GTIN })).toEqual({ kind: "lineComplete", orderItemId: 1 });
    });

    it("does not read another user's draft of the same order and account (catches: key without the user)", async () => {
      await saveDraftAt(JULIE, NOW);

      expect(await readReceiptDraft(receiptDraftKey({ ...JULIE, email: "marc@cabinet.fr" }))).toBeNull();
      expect(await readReceiptDraft(receiptDraftKey(JULIE))).not.toBeNull();
    });

    it("does not read the user's draft of the same order under another account (catches: key without the account)", async () => {
      await saveDraftAt(JULIE, NOW);

      expect(await readReceiptDraft(receiptDraftKey({ ...JULIE, accountId: "34" }))).toBeNull();
    });

    it("reads nothing from a damaged draft (catches: an unreadable draft thrown at the receipt)", async () => {
      asyncStore.set(receiptDraftKey(JULIE), '{"lines":[{"item":{}}]');
      expect(await readReceiptDraft(receiptDraftKey(JULIE))).toBeNull();

      asyncStore.set(receiptDraftKey(JULIE), JSON.stringify({ lines: [{ item: item(1), batches: [] }], marks: {} }));
      expect(await readReceiptDraft(receiptDraftKey(JULIE))).toBeNull();
    });

    it("removes the draft even with a write still on its way, and writes nothing after (catches: removal not queued behind the writes; saves kept after clear)", async () => {
      const draft = createReceiptDraft([item(1)]);
      draft.apply({ group: 1, gtin: GTIN });
      const saver = createDraftSaver(receiptDraftKey(JULIE), () => NOW);

      saver.save(draft.snapshot());
      saver.clear();
      saver.save(draft.snapshot());
      await flush();

      expect(stored(JULIE)).toBe(false);
    });
  });

  describe("bounds of a stored draft", () => {
    function storedWith(change: (snapshot: DraftSnapshot) => void) {
      const draft = createReceiptDraft([item(1)]);
      draft.apply({ group: 1, gtin: GTIN });
      const snapshot = draft.snapshot();
      change(snapshot);
      asyncStore.set(receiptDraftKey(JULIE), JSON.stringify(snapshot));
      return readReceiptDraft(receiptDraftKey(JULIE));
    }

    it("refuses a quantity the line sheet would refuse (catches: any finite number taken as a quantity)", async () => {
      expect(await storedWith(() => {})).not.toBeNull();
      expect(await storedWith((s) => (s.lines[0].batches[0].quantity = 1e12))).toBeNull();
      expect(await storedWith((s) => (s.lines[0].batches[0].quantity = 1.5))).toBeNull();
      expect(await storedWith((s) => (s.lines[0].batches[0].quantity = -1))).toBeNull();
    });

    it("refuses a price the line sheet would refuse (catches: any finite number taken as a price)", async () => {
      expect(await storedWith((s) => (s.lines[0].correctedPrice = 999999.99))).not.toBeNull();
      expect(await storedWith((s) => (s.lines[0].correctedPrice = 1e9))).toBeNull();
      expect(await storedWith((s) => (s.lines[0].correctedPrice = -2))).toBeNull();
    });
  });

  describe("opening a receipt", () => {
    const saved = (snapshot: DraftSnapshot | null) => ({ key: receiptDraftKey(JULIE), saved: snapshot });

    it("saves the draft at each change, and not while it holds nothing (catches: changes not saved; an empty draft written)", async () => {
      const { draft } = openReceiptDraft(saved(null), [item(1)], () => NOW);

      draft.setMarks({ badgeScan: "BADGE-7", badgeName: "Julie" });
      await flush();
      expect(stored(JULIE)).toBe(false);

      draft.apply({ group: 1, gtin: GTIN });
      await flush();
      expect(stored(JULIE)).toBe(true);

      draft.removeBatch(1, 0);
      await flush();
      expect(stored(JULIE)).toBe(false);
    });

    it("saves at once a restored draft that lost the scans of a line received meanwhile (catches: the reduced draft saved only at the next change)", async () => {
      await saveDraftAt(JULIE, NOW);
      const { touched } = openReceiptDraft(saved(await readReceiptDraft(receiptDraftKey(JULIE))), [
        item(1, { itemDeliveredQuantity: 2 }),
      ], () => NOW);
      await flush();

      expect(touched).toBe(1);
      expect(stored(JULIE)).toBe(false);
    });

    it("leaves the saved draft alone when the order comes back without lines (catches: the draft emptied by an order served empty)", async () => {
      await saveDraftAt(JULIE, NOW);
      const before = asyncStore.get(receiptDraftKey(JULIE));

      const { draft } = openReceiptDraft(saved(await readReceiptDraft(receiptDraftKey(JULIE))), [], () => NOW);
      draft.setMarks({ uncertainSend: true });
      await flush();

      expect(asyncStore.get(receiptDraftKey(JULIE))).toBe(before);
    });

    it("forgets the saved draft through what it returns (catches: forget not wired to the saver)", async () => {
      await saveDraftAt(JULIE, NOW);
      const { forget } = openReceiptDraft(saved(await readReceiptDraft(receiptDraftKey(JULIE))), [item(1)], () => NOW);

      forget();
      await flush();

      expect(stored(JULIE)).toBe(false);
    });
  });

  describe("pruning on the list", () => {
    it("removes a draft untouched for more than 30 days and keeps a newer one (catches: age ignored)", async () => {
      const old = { ...JULIE, orderId: 1 };
      const recent = { ...JULIE, orderId: 2 };
      await saveDraftAt(old, NOW - 31 * DAY_MS);
      await saveDraftAt(recent, NOW - 29 * DAY_MS);

      await pruneReceiptDrafts(NOW, "12", toReceive([1, 2]));

      expect(stored(old)).toBe(false);
      expect(stored(recent)).toBe(true);
    });

    it("removes the draft of an order no longer to receive once the list loaded fully (catches: drafts of received orders kept)", async () => {
      await saveDraftAt(JULIE, NOW);

      await pruneReceiptDrafts(NOW, "12", toReceive([7]));

      expect(stored(JULIE)).toBe(false);
    });

    it("keeps that draft when the list failed or stopped before its end (catches: removal without condition)", async () => {
      await saveDraftAt(JULIE, NOW);

      await pruneReceiptDrafts(NOW, "12");
      await pruneReceiptDrafts(NOW, "12", toReceive([7], false));

      expect(stored(JULIE)).toBe(true);
    });

    it("keeps the drafts of another user and of another account (catches: removal for every user or every account)", async () => {
      const marc = { ...JULIE, email: "marc@cabinet.fr" };
      const otherAccount = { ...JULIE, accountId: "34" };
      await saveDraftAt(marc, NOW);
      await saveDraftAt(otherAccount, NOW);

      await pruneReceiptDrafts(NOW, "12", toReceive([7]));

      expect(stored(marc)).toBe(true);
      expect(stored(otherAccount)).toBe(true);
    });

    it("keeps the draft of an order still to receive (catches: every draft of the user removed)", async () => {
      await saveDraftAt(JULIE, NOW);

      await pruneReceiptDrafts(NOW, "12", toReceive([5]));

      expect(stored(JULIE)).toBe(true);
    });

    it("leaves the other stored keys alone (catches: every key pruned)", async () => {
      asyncStore.set("activated_compte", "{}");

      await pruneReceiptDrafts(NOW, "12", toReceive([]));

      expect(asyncStore.has("activated_compte")).toBe(true);
    });
  });
});
