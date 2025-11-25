import { beforeEach, describe, expect, it, vi } from "vitest";
import { Method } from "../../model/Stock";
import apiClient from "../ApiService";
import ProductService from "../ProductService";
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

describe("ProductService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only the last three stats", async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        content: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
      },
    });

    const stats = await ProductService.getStats();

    expect(mockedApi.get).toHaveBeenCalledWith("/statistics/stocks/last");
    expect(stats).toHaveLength(3);
    expect(stats?.[0]).toEqual({ id: 1 });
    expect(mockedToast.error).not.toHaveBeenCalled();
  });

  it("sends scan payload and surfaces backend message", async () => {
    mockedApi.put.mockResolvedValue({
      data: { message: "OK<br/>detail" },
    });

    await ProductService.scan("CODE123", Method.increase);

    expect(mockedApi.put).toHaveBeenCalledWith("/product/stock", {
      action: Method.increase,
      code: "CODE123",
    });
    expect(mockedToast.success).toHaveBeenCalledWith("OK", "Succès");
  });

  it("retries network errors before throwing", async () => {
    vi.useFakeTimers();

    mockedApi.put
      .mockRejectedValueOnce({ code: "ERR_NETWORK" })
      .mockResolvedValueOnce({
        data: { message: "OK<br/>done" },
      });

    const scanPromise = ProductService.scan("CODE999", Method.decrease);

    await vi.runAllTimersAsync();
    await scanPromise;

    expect(mockedApi.put).toHaveBeenCalledTimes(2);
    expect(mockedToast.error).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
