import type { AxiosErrorType } from "../model/ApiError";
import HeaderStore from "../state/HeaderStore";
import { type ErrorToastArgs, movementErrorToast } from "./MovementErrorToast";
import OrderService, { AccountChangedError } from "./OrderService";
import type { ReceiptDraft } from "./ReceiptDraft";
import { receiptResult } from "./ReceiptResult";
import ReceiptResults from "../state/ReceiptResults";

// The API writes the movements asynchronously: a reload right after the receipt may not see them yet.
const LATER_MOVEMENTS_RELOAD_MS = 2000;

export type SendOutcome =
  | { kind: "sent" }
  | { kind: "busy" }
  | { kind: "empty" }
  | { kind: "accountChanged" }
  | { kind: "linesChanged"; count: number }
  | { kind: "confirmUncertain" }
  | { kind: "badgeRefused"; toast: ErrorToastArgs }
  | { kind: "failed"; toast: ErrorToastArgs };

type ReceiptSendOptions = {
  draft: ReceiptDraft;
  orderId: number;
  refreshMovements: () => void;
  scanSent: () => void;
};

const RELOAD_FAILED: ErrorToastArgs = ["Impossible de relire la commande avant l'envoi : réessayez.", "Réception non envoyée"];

const NOT_RECORDED: ErrorToastArgs = ["La réception n'a pas pu être enregistrée"];

function refusalOutcome(error: AxiosErrorType): SendOutcome {
  const { response } = error;
  if (!response) {
    return {
      kind: "failed",
      toast: ["La réception a peut-être été enregistrée : rouvrez la commande pour vérifier.", "Pas de réponse du serveur"],
    };
  }
  if (response.status === 403) {
    return { kind: "failed", toast: ["La réception est réservée aux personnes habilitées de votre cabinet"] };
  }
  if (response.status === 417) {
    const toast = movementErrorToast({
      response,
      badgeSent: !!error.config?.headers?.["Badge-Id"],
      tracingEnabled: HeaderStore.isTracingEnabled(),
    });
    return { kind: "badgeRefused", toast: toast ?? NOT_RECORDED };
  }
  return { kind: "failed", toast: NOT_RECORDED };
}

export function createReceiptSend({ draft, orderId, refreshMovements, scanSent }: ReceiptSendOptions) {
  const accountId = HeaderStore.getAccountId();
  // Not React state: a second press before the re-render must not send twice.
  let sending = false;

  const sendOnce = async (confirmedUncertain: boolean): Promise<SendOutcome> => {
    if (!accountId) {
      return { kind: "accountChanged" };
    }
    let reloaded;
    try {
      reloaded = await OrderService.getOrderItems(accountId, orderId);
    } catch (error) {
      return error instanceof AccountChangedError ? { kind: "accountChanged" } : { kind: "failed", toast: RELOAD_FAILED };
    }
    const changed = draft.reconcile(reloaded);
    if (changed.length > 0) {
      return { kind: "linesChanged", count: changed.length };
    }
    if (draft.marks().uncertainSend && !confirmedUncertain) {
      return { kind: "confirmUncertain" };
    }
    const body = draft.receiveBody();
    if (body.items.length === 0) {
      return { kind: "empty" };
    }
    if (HeaderStore.getAccountId() !== accountId) {
      return { kind: "accountChanged" };
    }
    // Codes recognised during the POST change the draft, not what was sent.
    const result = receiptResult(draft.lines());
    scanSent();
    try {
      await OrderService.receiveOrder(accountId, orderId, body);
    } catch (error) {
      const refusal = error as AxiosErrorType;
      if (!refusal.response) {
        draft.setMarks({ uncertainSend: true });
      }
      return refusalOutcome(refusal);
    }
    draft.setMarks({ uncertainSend: false });
    refreshMovements();
    setTimeout(refreshMovements, LATER_MOVEMENTS_RELOAD_MS);
    ReceiptResults.remember(accountId, orderId, result);
    return { kind: "sent" };
  };

  return {
    isSending: () => sending,
    send: async (confirmedUncertain = false): Promise<SendOutcome> => {
      if (sending) {
        return { kind: "busy" };
      }
      sending = true;
      const outcome = await sendOnce(confirmedUncertain);
      if (outcome.kind !== "sent") {
        sending = false;
      }
      return outcome;
    },
  };
}
