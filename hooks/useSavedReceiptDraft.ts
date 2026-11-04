import { useEffect, useState } from "react";

import { loadReceiptDraft, type SavedReceiptDraft } from "@/services/ReceiptDraftStore";

export function useSavedReceiptDraft(accountId: string | undefined, orderId: number | undefined) {
  const [read, setRead] = useState<(SavedReceiptDraft & { accountId: string; orderId: number }) | null>(null);

  useEffect(() => {
    if (!accountId || orderId === undefined) {
      return;
    }
    let cancelled = false;
    loadReceiptDraft(accountId, orderId).then((saved) => {
      if (!cancelled) {
        setRead({ ...saved, accountId, orderId });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [accountId, orderId]);

  return read && read.accountId === accountId && read.orderId === orderId ? read : undefined;
}
