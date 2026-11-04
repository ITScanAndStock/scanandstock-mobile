import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderItem } from "../../model/Order";
import apiClient from "../ApiService";
import { createReceiptDraft } from "../ReceiptDraft";
import ReceiptRecognizer from "../ReceiptRecognizer";

vi.mock("../ApiService", () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockedApi = apiClient as unknown as { get: ReturnType<typeof vi.fn> };

const EAN_13 = "3401234567890";
const GS1_CODE = "0103401234567890172803311012345";

function item(orderItemId: number, overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    orderItemId,
    itemProductId: orderItemId * 10,
    itemProviderId: 7,
    itemDesignation: `Produit ${orderItemId}`,
    itemGtin: EAN_13,
    itemQuantity: 6,
    itemDeliveredQuantity: 0,
    ...overrides,
  };
}

function answer(decode: unknown, scan: unknown) {
  mockedApi.get.mockImplementation((url: string) => {
    const reply = url === "/product/decode" ? decode : scan;
    return reply instanceof Error ? Promise.reject(reply) : Promise.resolve(reply);
  });
}

const scanCalls = () => mockedApi.get.mock.calls.filter(([url]) => url === "/product/scan");

describe("ReceiptRecognizer.recognize", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("finds the line whose EAN-13 is the decoded GTIN-14, without the fallback (catches: GTIN-14 compared to the EAN-13 as is)", async () => {
    const draft = createReceiptDraft([item(1)]);
    answer({ data: { gtin: `0${EAN_13}`, batchNumber: "12345", expirationDate: "31-03-2028" } }, { data: "" });

    const outcome = await ReceiptRecognizer.recognize(GS1_CODE, 1, draft.apply);

    expect(outcome).toEqual({
      kind: "added",
      orderItemId: 1,
      batchNumber: "12345",
      expirationDate: "31-03-2028",
      merged: false,
      providerChoice: false,
    });
    expect(mockedApi.get).toHaveBeenCalledWith("/product/decode", { params: { code: GS1_CODE } });
    expect(scanCalls()).toHaveLength(0);
  });

  it("asks /product/scan with the raw code when no line has the decoded GTIN, keeping the decoded batch (catches: fallback removed, decoded GTIN passed, decoded batch dropped)", async () => {
    const draft = createReceiptDraft([item(1, { itemGtin: undefined })]);
    answer({ data: { gtin: "03400000000001", batchNumber: "12345" } }, { data: [{ productId: 10 }] });

    const outcome = await ReceiptRecognizer.recognize(GS1_CODE, 1, draft.apply);

    expect(outcome).toMatchObject({ kind: "added", orderItemId: 1, batchNumber: "12345" });
    expect(scanCalls()).toEqual([["/product/scan", { params: { code: GS1_CODE } }]]);
  });

  it("falls back on /product/scan when the decoded GTIN only finds a complete line (catches: fallback skipped on a line found complete)", async () => {
    const draft = createReceiptDraft([item(1, { itemDeliveredQuantity: 6 }), item(2, { itemGtin: "3409876543210" })]);
    answer({ data: { gtin: EAN_13 } }, { data: [{ productId: 20 }] });

    const outcome = await ReceiptRecognizer.recognize("ABC-1234", 1, draft.apply);

    expect(outcome).toMatchObject({ kind: "added", orderItemId: 2 });
  });

  it("falls back on /product/scan when the decoding fails (catches: fallback only when the decoded GTIN finds no line)", async () => {
    const draft = createReceiptDraft([item(1)]);
    answer(new Error("Network Error"), { data: [{ productId: 10 }] });

    const outcome = await ReceiptRecognizer.recognize("ABC-1234", 1, draft.apply);

    expect(outcome).toMatchObject({ kind: "added", orderItemId: 1 });
    expect(scanCalls()).toEqual([["/product/scan", { params: { code: "ABC-1234" } }]]);
  });

  it("finds the line whose product is the second one /product/scan returns (catches: first product only)", async () => {
    const draft = createReceiptDraft([item(1, { itemGtin: undefined })]);
    answer({ data: { gtin: "ABC-1234" } }, { data: [{ productId: 99 }, { productId: 10 }] });

    const outcome = await ReceiptRecognizer.recognize("ABC-1234", 1, draft.apply);

    expect(outcome).toMatchObject({ kind: "added", orderItemId: 1 });
  });

  it("says the code is not in the order on a 204 of /product/scan (catches: 204 read as a network failure)", async () => {
    const draft = createReceiptDraft([item(1)]);
    answer({ data: { gtin: "ABC-1234" } }, { status: 204, data: "" });

    const outcome = await ReceiptRecognizer.recognize("ABC-1234", 1, draft.apply);

    expect(outcome).toEqual({ kind: "notInOrder" });
    expect(draft.count()).toBe(0);
  });

  it("says the code could not be checked when /product/scan fails (catches: failure read as not in the order)", async () => {
    const draft = createReceiptDraft([item(1)]);
    answer({ data: { gtin: "ABC-1234" } }, new Error("Network Error"));

    const outcome = await ReceiptRecognizer.recognize("ABC-1234", 1, draft.apply);

    expect(outcome).toEqual({ kind: "unverifiable" });
    expect(draft.count()).toBe(0);
  });

  it("stops without the fallback when the receipt no longer takes the code (catches: fallback asked after a refused apply)", async () => {
    answer({ data: { gtin: "ABC-1234" } }, { data: [{ productId: 10 }] });

    const outcome = await ReceiptRecognizer.recognize("ABC-1234", 1, () => null);

    expect(outcome).toBeNull();
    expect(scanCalls()).toHaveLength(0);
  });
});
