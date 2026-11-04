import { beforeEach, describe, expect, it, vi } from "vitest";
import { Method } from "../../model/Stock";
import HeaderStore from "../../state/HeaderStore";
import { AccountChangedError } from "../AccountResponse";
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

  describe("getMovementsPage", () => {
    const ACCOUNT = "12";
    const content = [{ id: 7 }, { id: 5 }, { id: 6 }];

    function answer(accountHeader: unknown, status = 200, data: unknown = { content }) {
      return { status, data, config: { headers: { "Account-Id": accountHeader } } };
    }

    it("asks /statistics/stocks for 20 movements at the offset and returns them in order (catches: old /stocks/last route; offset not sent)", async () => {
      mockedApi.get.mockResolvedValue(answer(ACCOUNT));

      const movements = await ProductService.getMovementsPage(ACCOUNT, 40);

      expect(mockedApi.get).toHaveBeenCalledWith("/statistics/stocks", {
        params: { "page.size": 20, "page.offset": 40 },
      });
      expect(movements).toEqual(content);
    });

    it("returns an empty page on a 204 with no body (catches: content read on a 204)", async () => {
      mockedApi.get.mockResolvedValue(answer(ACCOUNT, 204, ""));

      await expect(ProductService.getMovementsPage(ACCOUNT, 20)).resolves.toEqual([]);
    });

    it("accepts a page sent under account 12 as a number for a call made with \"12\" (catches: strict comparison without conversion)", async () => {
      mockedApi.get.mockResolvedValue(answer(12));

      await expect(ProductService.getMovementsPage(ACCOUNT, 0)).resolves.toEqual(content);
    });

    it("refuses a page sent under another account (catches: account check removed)", async () => {
      mockedApi.get.mockResolvedValue(answer(13));

      await expect(ProductService.getMovementsPage(ACCOUNT, 0)).rejects.toThrow(AccountChangedError);
    });

    it("rethrows an HTTP error without a toast (catches: toast kept in the service)", async () => {
      const failure = { response: { status: 500, data: {} }, message: "server error" };
      mockedApi.get.mockRejectedValue(failure);

      await expect(ProductService.getMovementsPage(ACCOUNT, 0)).rejects.toBe(failure);
      expect(mockedToast.error).not.toHaveBeenCalled();
    });
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

  it("leaves a batch choice to the caller without a toast (catches: toast shown on a 222)", async () => {
    const batchChoice = {
      response: { status: 400, data: { errorMessage: "RUPTURE STOCK : <br/>Fraise 856", code: 222 } },
      message: "batch choice",
    };
    mockedApi.put.mockRejectedValueOnce(batchChoice);

    await expect(ProductService.scan("CODE222", Method.decrease)).rejects.toBe(batchChoice);

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
