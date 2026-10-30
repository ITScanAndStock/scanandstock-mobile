import HeaderStore from "../state/HeaderStore";
import type { ReceiptDraft } from "./ReceiptDraft";
import type { ApplyCode, Recognition } from "./ReceiptRecognizer";
import { createScanGate } from "./ScanGate";

export type ReceiptPhase = "badge" | "products";

type ReceiptBadge = {
  isValid: () => boolean;
  connect: (code: string) => Promise<boolean>;
};

type ReceiptScanOptions = {
  draft: ReceiptDraft;
  recognize: (code: string, group: number, apply: ApplyCode) => Promise<Recognition | null>;
  onRecognized: (recognition: Recognition) => void;
  onAccountChanged: () => void;
  badge: ReceiptBadge;
  onBadge: (connected: boolean) => void;
};

export function createReceiptScan({
  draft,
  recognize,
  onRecognized,
  onAccountChanged,
  badge,
  onBadge,
}: ReceiptScanOptions) {
  const gate = createScanGate();
  const accountId = HeaderStore.getAccountId();
  // A state, not isBadgeValid(): once the badge is in, an expiry must not turn the next product into a badge.
  const badgeNeeded = () => HeaderStore.isTracingEnabled() && !badge.isValid();
  let phase: ReceiptPhase = badgeNeeded() ? "badge" : "products";
  // The badge timer only restarts on a request: a send asked with an expired badge waits for the next one.
  let sendAfterBadge: (() => void) | null = null;
  const listeners = new Set<() => void>();
  // Bumped when the receipt closes, so an answer to a code sent before changes and shows nothing.
  let generation = 0;
  let sheetOpen = false;

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

  const setPhase = (next: ReceiptPhase) => {
    phase = next;
    listeners.forEach((listener) => listener());
  };

  const connectSent = async (code: string, now: number) => {
    const run = generation;
    const connected = await badge.connect(code);
    if (run !== generation) {
      return;
    }
    if (connected) {
      // Its own group: a product seen while the badge stays in view would otherwise join the badge's.
      gate.badgeConnected(code, now);
      setPhase("products");
    }
    gate.sendFinished(connected);
    onBadge(connected);
    const send = connected ? sendAfterBadge : null;
    if (send) {
      sendAfterBadge = null;
      send();
    }
  };

  return {
    frame: (raw: string, now: number) => {
      // The gate's frame() does not read cameraClosed: under the sheet, a code would change the draft being edited.
      if (sheetOpen) {
        return;
      }
      const decision = gate.frame(raw, now);
      if (decision.kind !== "send") {
        return;
      }
      // Every request reads Account-Id from HeaderStore: under another account, the product would be another cabinet's.
      if (HeaderStore.getAccountId() !== accountId) {
        onAccountChanged();
        return;
      }
      if (phase === "badge") {
        void connectSent(decision.code, now);
      } else {
        void recognizeSent(decision.code, decision.group);
      }
    },
    phase: () => phase,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    requestSend: (send: () => void) => {
      if (badgeNeeded()) {
        sendAfterBadge = send;
        setPhase("badge");
      } else {
        send();
      }
    },
    badgeRefused: () => {
      // Without tracing, no Badge-Id is ever sent: a badge step would have no way out.
      if (HeaderStore.isTracingEnabled()) {
        setPhase("badge");
      }
    },
    openSheet: (now: number) => {
      if (sheetOpen || gate.isBusy()) {
        return false;
      }
      sheetOpen = true;
      // The send waiting for the badge was asked before this edit: it needs a new press.
      sendAfterBadge = null;
      gate.cameraClosed(now);
      return true;
    },
    closeSheet: () => {
      sheetOpen = false;
      gate.cameraReopened();
    },
    close: () => {
      generation += 1;
    },
  };
}

export type ReceiptScan = ReturnType<typeof createReceiptScan>;
