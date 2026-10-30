import type { DraftLine } from "./ReceiptDraft";
import type { Recognition } from "./ReceiptRecognizer";

export type ReceiptBanner = { tone: "success" | "error"; title: string; detail?: string };

// /product/decode writes dd-MM-yyyy; a box prints its expiration as a month.
export function expirationMonth(expirationDate: string) {
  const parts = /^\d{2}-(\d{2})-(\d{4})$/.exec(expirationDate);
  return parts ? `${parts[1]}/${parts[2]}` : expirationDate;
}

const itemOf = (lines: readonly DraftLine[], orderItemId: number) =>
  lines.find((line) => line.item.orderItemId === orderItemId)?.item;

const withDetail = (banner: ReceiptBanner, parts: (string | false | undefined)[]): ReceiptBanner => {
  const detail = parts.filter(Boolean).join(" · ");
  return detail ? { ...banner, detail } : banner;
};

export function receiptBanner(recognition: Recognition, lines: readonly DraftLine[]): ReceiptBanner {
  switch (recognition.kind) {
    case "added": {
      const item = itemOf(lines, recognition.orderItemId);
      return withDetail({ tone: "success", title: `+1 ${item?.itemDesignation ?? ""}`.trim() }, [
        recognition.batchNumber && `Lot ${recognition.batchNumber}`,
        recognition.expirationDate && `péremption ${expirationMonth(recognition.expirationDate)}`,
        recognition.providerChoice && item?.itemProviderName,
      ]);
    }
    case "lineComplete":
      return withDetail({ tone: "error", title: "Ligne complète" }, [
        itemOf(lines, recognition.orderItemId)?.itemDesignation,
      ]);
    case "notInOrder":
      return { tone: "error", title: "Ce produit n'est pas dans la commande" };
    case "unverifiable":
      return {
        tone: "error",
        title: "Impossible de vérifier ce code",
        detail: "Vérifiez la connexion, puis scannez de nouveau",
      };
  }
}
