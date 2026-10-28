import { Batch, ScannedProduct } from "@/model/Batch";
import { Method, StockModel } from "@/model/Stock";
import apiClient from "./ApiService";

type DecodedCode = { gtin: string };

class BatchService {
  async findScannedProduct(code: string): Promise<ScannedProduct | null> {
    const decoded = await apiClient.get<DecodedCode>("/product/decode", { params: { code } });
    const scanned = await apiClient.get<ScannedProduct[] | "">("/product/scan", {
      params: { code: decoded.data.gtin },
    });
    const [first] = scanned.data || [];
    return first ? { stockId: first.stockId, designation: first.designation } : null;
  }

  async getBatches(stockId: number): Promise<Batch[]> {
    const response = await apiClient.get<Batch[] | "">("/product/batches", { params: { stockId } });
    return response.data || [];
  }

  async withdrawFromBatch(stockId: number, stockDetailsId: number): Promise<{ message: string }> {
    const response = await apiClient.put<{ message: string }>("/product/stock", {
      stockId,
      stockDetailsId,
      action: Method.decrease,
      // Without it, the API takes a whole box off a product managed by the box.
      updateUnit: true,
      force: true,
    } satisfies Partial<StockModel>);
    return response.data;
  }
}

export default new BatchService();
