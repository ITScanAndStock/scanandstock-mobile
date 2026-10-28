import { AxiosErrorType } from "@/model/ApiError";
import { Batch, BatchIdentity, ScannedProduct } from "@/model/Batch";
import { orderBatches } from "./BatchOrder";
import {
  ErrorToastArgs,
  GENERIC_MESSAGE,
  isBatchChoiceRequired,
  movementErrorToast,
} from "./MovementErrorToast";
import { ScanGate } from "./ScanGate";

const NO_BATCH_MESSAGE = "Aucun lot en stock pour ce produit : la sortie n'est pas faite.";
const LOAD_FAILED_MESSAGE = "Impossible de charger les lots : la sortie n'est pas faite.";
const BATCH_ALREADY_USED_TOAST: ErrorToastArgs = [
  "Ce lot vient d'être utilisé : rescannez le produit pour choisir un autre lot.",
  "Lot déjà utilisé",
];
// Refusal of a product managed by the box whose batch line was used meanwhile.
const STOCK_DETAIL_USED_MESSAGE = "Stock detail already used";

export type BatchChoiceState =
  | { kind: "closed" }
  | { kind: "loading" }
  | { kind: "open" | "sending"; stockId: number; designation: string; batches: Batch[] };

type BatchChoiceOptions = {
  gate: ScanGate;
  service: {
    findScannedProduct: (code: string) => Promise<ScannedProduct | null>;
    getBatches: (stockId: number) => Promise<Batch[]>;
    withdrawFromBatch: (stockId: number, stockDetailsId: number) => Promise<{ message: string }>;
  };
  rememberedBatches: {
    remember: (stockId: number, batch: BatchIdentity) => void;
    get: (stockId: number) => BatchIdentity | undefined;
    forgetAll: () => void;
  };
  isTracingEnabled: () => boolean;
  isBadgeValid: () => boolean;
  scanSent: () => void;
  now: () => number;
};

export type BatchChoiceFeedback = {
  onSucceeded: (response: { message: string }) => void;
  onFailed: (...toast: ErrorToastArgs) => void;
};

export function createBatchChoice({
  gate,
  service,
  rememberedBatches,
  isTracingEnabled,
  isBadgeValid,
  scanSent,
  now,
}: BatchChoiceOptions) {
  let state: BatchChoiceState = { kind: "closed" };
  // Bumped when the camera closes, so an answer to a request sent before shows nothing.
  let generation = 0;
  const listeners = new Set<() => void>();

  const setState = (next: BatchChoiceState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  const fail = ({ onFailed }: BatchChoiceFeedback, ...toast: ErrorToastArgs) => {
    gate.sendFinished(false);
    setState({ kind: "closed" });
    onFailed(...toast);
  };

  const load = async (code: string) => {
    const product = await service.findScannedProduct(code);
    if (!product) {
      return null;
    }
    return { product, batches: await service.getBatches(product.stockId) };
  };

  const start = async (code: string, feedback: BatchChoiceFeedback) => {
    const run = generation;
    setState({ kind: "loading" });
    let loaded: Awaited<ReturnType<typeof load>>;
    try {
      loaded = await load(code);
    } catch {
      if (run === generation) {
        fail(feedback, LOAD_FAILED_MESSAGE);
      }
      return;
    }
    if (run !== generation) {
      return;
    }
    if (!loaded) {
      fail(feedback, GENERIC_MESSAGE);
      return;
    }
    if (loaded.batches.length === 0) {
      fail(feedback, NO_BATCH_MESSAGE);
      return;
    }
    const { stockId, designation } = loaded.product;
    gate.alertOpened();
    setState({
      kind: "open",
      stockId,
      designation,
      batches: orderBatches(loaded.batches, rememberedBatches.get(stockId)),
    });
  };

  const refusalToast = (error: AxiosErrorType): ErrorToastArgs => {
    const { response } = error;
    if (isBatchChoiceRequired(response) || response?.data?.errorMessage === STOCK_DETAIL_USED_MESSAGE) {
      return BATCH_ALREADY_USED_TOAST;
    }
    return (
      movementErrorToast({
        response,
        badgeSent: !!error.config?.headers?.["Badge-Id"],
        tracingEnabled: isTracingEnabled(),
      }) ?? [GENERIC_MESSAGE]
    );
  };

  const cancel = () => {
    if (state.kind !== "open") {
      return;
    }
    gate.alertCancelled(now());
    setState({ kind: "closed" });
  };

  const withdraw = async (batch: Batch, feedback: BatchChoiceFeedback) => {
    if (state.kind !== "open") {
      return;
    }
    const { stockId } = state;
    rememberedBatches.remember(stockId, batch);
    if (isTracingEnabled() && !isBadgeValid()) {
      cancel();
      feedback.onFailed("Scannez votre badge, puis rescannez le produit.", "Badge expiré");
      return;
    }
    const run = generation;
    scanSent();
    gate.alertForced(now());
    setState({ ...state, kind: "sending" });
    let response: { message: string };
    try {
      response = await service.withdrawFromBatch(stockId, batch.stockDetailsId);
    } catch (error) {
      if (run === generation) {
        fail(feedback, ...refusalToast(error as AxiosErrorType));
      }
      return;
    }
    if (run !== generation) {
      return;
    }
    gate.sendFinished(true);
    setState({ kind: "closed" });
    feedback.onSucceeded(response);
  };

  const cameraClosed = () => {
    if (state.kind === "open") {
      cancel();
    } else if (state.kind === "loading" || state.kind === "sending") {
      generation += 1;
      gate.sendFinished(false);
      setState({ kind: "closed" });
    }
  };

  return {
    start: (code: string, feedback: BatchChoiceFeedback) => void start(code, feedback),
    withdraw: (batch: Batch, feedback: BatchChoiceFeedback) => void withdraw(batch, feedback),
    cancel,
    cameraClosed,
    forgetRememberedBatches: () => rememberedBatches.forgetAll(),
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type BatchChoice = ReturnType<typeof createBatchChoice>;
