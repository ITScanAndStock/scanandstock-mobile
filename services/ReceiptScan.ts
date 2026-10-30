import HeaderStore from "../state/HeaderStore";
import type { ReceiptDraft } from "./ReceiptDraft";
import type { ApplyCode, Recognition } from "./ReceiptRecognizer";
import { createScanGate } from "./ScanGate";

type ReceiptScanOptions = {
  draft: ReceiptDraft;
  recognize: (code: string, group: number, apply: ApplyCode) => Promise<Recognition | null>;
  onRecognized: (recognition: Recognition) => void;
  onAccountChanged: () => void;
};

export function createReceiptScan({ draft, recognize, onRecognized, onAccountChanged }: ReceiptScanOptions) {
  const gate = createScanGate();
  const accountId = HeaderStore.getAccountId();
  // Bumped when the receipt closes, so an answer to a code sent before changes and shows nothing.
  let generation = 0;

  const recognizeSent = async (code: string, group: number) => {
    const run = generation;
    const recognition = await recognize(code, group, (recognized) =>
      run === generation ? draft.apply(recognized) : null,
    );
    if (run !== generation || !recognition) {
      return;
    }
    gate.sendFinished(recognition.kind === "added");
    onRecognized(recognition);
  };

  return {
    frame: (raw: string, now: number) => {
      const decision = gate.frame(raw, now);
      if (decision.kind !== "send") {
        return;
      }
      // Every request reads Account-Id from HeaderStore: under another account, the product would be another cabinet's.
      if (HeaderStore.getAccountId() !== accountId) {
        onAccountChanged();
        return;
      }
      void recognizeSent(decision.code, decision.group);
    },
    close: () => {
      generation += 1;
    },
  };
}

export type ReceiptScan = ReturnType<typeof createReceiptScan>;
