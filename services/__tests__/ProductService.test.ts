import { beforeEach, describe, expect, it, vi } from "vitest";
import { Method } from "../../model/Stock";
import HeaderStore from "../../state/HeaderStore";
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
    vi.resetAllMocks();
    HeaderStore.reset();
  });

  it("returns every stat sent by the API, in order", async () => {
    const content = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
    mockedApi.get.mockResolvedValue({ data: { content } });

    const stats = await ProductService.getStats();

    expect(mockedApi.get).toHaveBeenCalledWith("/statistics/stocks/last");
    expect(stats).toEqual(content);
    expect(mockedToast.error).not.toHaveBeenCalled();
  });

  it("sends scan payload and surfaces backend message", async () => {
    mockedApi.put.mockResolvedValue({
      data: { message: "OK<br/>detail" },
    });

    await ProductService.scan("CODE123", Method.increase);

    expect(mockedApi.put).toHaveBeenCalledWith("/product/stock", {
      stockId: 0,
      stockDetailsId: 0,
      action: Method.increase,
      code: "CODE123",
      expirationDate: "",
      batchNumber: "",
      updateUnit: false,
      force: false,
    });
    expect(mockedToast.success).toHaveBeenCalledWith("OK", "Succès");
  });

  it("sends the scan only once when no answer comes back", async () => {
    const failure = { code: "ECONNABORTED", message: "timeout" };
    mockedApi.put
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({ data: { message: "OK<br/>done" } });

    await expect(
      ProductService.scan("CODE999", Method.decrease),
    ).rejects.toBe(failure);

    expect(mockedApi.put).toHaveBeenCalledTimes(1);
    expect(mockedToast.error).toHaveBeenCalledWith(
      "Le scan a peut-être été enregistré : vérifiez le stock avant de scanner à nouveau.",
      "Pas de réponse du serveur",
    );
  });

  it("reports a server refusal as a failed scan", async () => {
    const failure = {
      response: { status: 500, data: {} },
      message: "server error",
    };
    mockedApi.put.mockRejectedValueOnce(failure);

    await expect(
      ProductService.scan("CODE500", Method.increase),
    ).rejects.toBe(failure);

    expect(mockedApi.put).toHaveBeenCalledTimes(1);
    expect(mockedToast.error).toHaveBeenCalledWith(
      "Erreur lors du scan du produit",
    );
  });

  it("leaves an expiry conflict to the caller without a toast", async () => {
    const conflict = {
      response: { status: 409, data: {} },
      message: "conflict",
    };
    mockedApi.put.mockRejectedValueOnce(conflict);

    await expect(
      ProductService.scan("CODE409", Method.decrease),
    ).rejects.toBe(conflict);

    expect(mockedToast.error).not.toHaveBeenCalled();
  });

  it("tells the user to remove a refused badge when one was sent", async () => {
    const refusal = {
      response: { status: 417, data: {} },
      config: { headers: { "Badge-Id": "BADGE-OLD" } },
      message: "Missing badge for action",
    };
    mockedApi.put.mockRejectedValueOnce(refusal);

    await expect(
      ProductService.scan("CODE417", Method.decrease),
    ).rejects.toBe(refusal);

    expect(mockedToast.error).toHaveBeenCalledTimes(1);
    expect(mockedToast.error).toHaveBeenCalledWith(
      "Touchez la pastille de votre badge pour le retirer, puis scannez un badge actif.",
      "Badge refusé",
      6000,
    );
  });

  it("asks for a badge scan when none was sent and tracing is on", async () => {
    HeaderStore.setTracingEnabled(true);
    HeaderStore.setBadgeScan("BADGE-SCANNED-AFTER");
    const refusal = {
      response: { status: 417, data: {} },
      config: { headers: {} },
      message: "Missing badge for action",
    };
    mockedApi.put.mockRejectedValueOnce(refusal);

    await expect(
      ProductService.scan("CODE417", Method.decrease),
    ).rejects.toBe(refusal);

    expect(mockedToast.error).toHaveBeenCalledTimes(1);
    expect(mockedToast.error).toHaveBeenCalledWith(
      "Scannez votre badge puis recommencez.",
      "Badge requis",
      6000,
    );
  });

  it("asks to sign in again when the account traces badges but the app does not", async () => {
    const refusal = {
      response: { status: 417, data: {} },
      config: { headers: {} },
      message: "Missing badge for action",
    };
    mockedApi.put.mockRejectedValueOnce(refusal);

    await expect(
      ProductService.scan("CODE417", Method.decrease),
    ).rejects.toBe(refusal);

    expect(mockedToast.error).toHaveBeenCalledTimes(1);
    expect(mockedToast.error).toHaveBeenCalledWith(
      "Le traçage par badge est activé sur votre compte : déconnectez-vous puis reconnectez-vous.",
      "Badge requis",
      6000,
    );
  });
});
