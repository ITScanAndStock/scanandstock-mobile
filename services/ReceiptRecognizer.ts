import type { RecognizedCode, ScanOutcome } from "./ReceiptDraft";
import apiClient from "./ApiService";

type DecodedCode = { gtin?: string; batchNumber?: string; expirationDate?: string };

type ScannedStock = { productId: number };

export type Recognition = ScanOutcome | { kind: "unverifiable" };

async function decode(code: string): Promise<DecodedCode | null> {
  try {
    const { gtin, batchNumber, expirationDate } = (await apiClient.get<DecodedCode>("/product/decode", { params: { code } }))
      .data;
    return { gtin, batchNumber, expirationDate };
  } catch {
    return null;
  }
}

// apply returns null once the receipt no longer takes codes (closed meanwhile): the recognition stops there.
export type ApplyCode = (code: RecognizedCode) => ScanOutcome | null;

class ReceiptRecognizer {
  async recognize(code: string, group: number, apply: ApplyCode): Promise<Recognition | null> {
    const decoded = await decode(code);
    const recognized: RecognizedCode = { group, ...decoded };
    if (decoded) {
      const byGtin = apply(recognized);
      if (!byGtin || byGtin.kind === "added") {
        return byGtin;
      }
    }
    let productIds: number[];
    try {
      // The raw code, as the web sends it: the server decodes it itself.
      const scanned = await apiClient.get<ScannedStock[] | "">("/product/scan", { params: { code } });
      productIds = (scanned.data || []).map((stock) => stock.productId);
    } catch {
      return { kind: "unverifiable" };
    }
    return apply({ ...recognized, productIds });
  }
}

export default new ReceiptRecognizer();
