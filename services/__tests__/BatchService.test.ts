import { beforeEach, describe, expect, it, vi } from "vitest";
import { Method } from "../../model/Stock";
import apiClient from "../ApiService";
import BatchService from "../BatchService";
import ToastService from "../ToastService";

vi.mock("../ApiService", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock("../ToastService", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockedApi = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
};

const mockedToast = ToastService as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

const GS1_CODE = "0103400930000123172812311012345";
const GTIN = "03400930000123";

describe("BatchService.findScannedProduct", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("asks /product/scan for the decoded GTIN and takes the first product (catches: raw code sent, last product taken)", async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === "/product/decode") {
        return Promise.resolve({ data: { gtin: GTIN, batchNumber: "12345", code: GS1_CODE } });
      }
      return Promise.resolve({
        data: [
          { productId: 1, gtin: GTIN, code: "A", designation: "Fraise 856", stockId: 42, stock: 5 },
          { productId: 2, gtin: GTIN, code: "B", designation: "Fraise 857", stockId: 43, stock: 5 },
        ],
      });
    });

    const product = await BatchService.findScannedProduct(GS1_CODE);

    expect(mockedApi.get).toHaveBeenCalledWith("/product/decode", { params: { code: GS1_CODE } });
    expect(mockedApi.get).toHaveBeenCalledWith("/product/scan", { params: { code: GTIN } });
    expect(product).toEqual({ stockId: 42, designation: "Fraise 856" });
  });

  it("returns no product on a 204 with an empty body (catches: a product returned without an entry in the list)", async () => {
    mockedApi.get.mockImplementation((url: string) =>
      Promise.resolve(url === "/product/decode" ? { data: { gtin: GTIN } } : { status: 204, data: "" }),
    );

    expect(await BatchService.findScannedProduct(GS1_CODE)).toBeNull();
  });
});

describe("BatchService.getBatches", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("asks the batches of the stock and returns them (catches: stockId not sent)", async () => {
    const batches = [{ stockDetailsId: 9, quantity: 2, expirationDate: "01-12-2027" }];
    mockedApi.get.mockResolvedValue({ data: batches });

    expect(await BatchService.getBatches(42)).toEqual(batches);
    expect(mockedApi.get).toHaveBeenCalledWith("/product/batches", { params: { stockId: 42 } });
  });

  it("returns an empty list on a 204 with an empty body (catches: data returned as is)", async () => {
    mockedApi.get.mockResolvedValue({ status: 204, data: "" });

    expect(await BatchService.getBatches(42)).toEqual([]);
  });
});

describe("BatchService.withdrawFromBatch", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("takes one unit out of the chosen batch by stockDetailsId alone, without toast (catches: updateUnit false, increase, another batch, code added, batch and date added, toast added)", async () => {
    const answer = { message: "Sortie OK<br/>détail" };
    mockedApi.put.mockResolvedValue({ data: answer });

    const result = await BatchService.withdrawFromBatch(42, 9);

    expect(result).toEqual(answer);
    expect(mockedApi.put).toHaveBeenCalledTimes(1);
    const [url, body] = mockedApi.put.mock.calls[0];
    expect(url).toBe("/product/stock");
    expect(body).toMatchObject({
      stockId: 42,
      stockDetailsId: 9,
      action: Method.decrease,
      updateUnit: true,
      force: true,
    });
    expect(body.code ?? "").toBe("");
    expect(body.batchNumber ?? "").toBe("");
    expect(body.expirationDate ?? "").toBe("");
    expect(mockedToast.success).not.toHaveBeenCalled();
    expect(mockedToast.error).not.toHaveBeenCalled();
  });

  it("rejects with the API error, without toast (catches: error swallowed, toast added)", async () => {
    const failure = { response: { status: 400, data: { errorMessage: "Stock detail already used", code: 0 } } };
    mockedApi.put.mockRejectedValue(failure);

    await expect(BatchService.withdrawFromBatch(42, 9)).rejects.toBe(failure);
    expect(mockedToast.error).not.toHaveBeenCalled();
  });
});
