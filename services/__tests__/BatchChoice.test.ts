import { beforeEach, describe, expect, it, vi } from "vitest";
import { Batch, ScannedProduct } from "../../model/Batch";
import RememberedBatchStore from "../../state/RememberedBatchStore";
import { createBatchChoice } from "../BatchChoice";
import { createScanGate, ScanGate } from "../ScanGate";

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void };

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const CODE = "0103400930000123";
const PRODUCT: ScannedProduct = { stockId: 42, designation: "Fraise 856" };
const LATE: Batch = { stockDetailsId: 7, quantity: 3, batchNumber: "LT2291", expirationDate: "31-03-2028" };
const EARLY: Batch = { stockDetailsId: 9, quantity: 1, batchNumber: "LT1876", expirationDate: "30-11-2026" };

function sendScan(gate: ScanGate) {
  for (let frame = 0; frame < 3; frame += 1) {
    gate.frame(CODE, 1000 + frame);
  }
  expect(gate.isBusy()).toBe(true);
}

function setup({ tracing = false, badgeValid = true } = {}) {
  const gate = createScanGate();
  const calls: string[] = [];
  const spy = <T extends unknown[]>(name: string, fn: (...args: T) => void) => (...args: T) => {
    calls.push(name);
    fn(...args);
  };
  const product = deferred<ScannedProduct | null>();
  const batches = deferred<Batch[]>();
  const withdrawals: Deferred<{ message: string }>[] = [];
  const service = {
    findScannedProduct: vi.fn(() => product.promise),
    getBatches: vi.fn(() => batches.promise),
    withdrawFromBatch: vi.fn(() => {
      calls.push("withdrawFromBatch");
      const withdrawal = deferred<{ message: string }>();
      withdrawals.push(withdrawal);
      return withdrawal.promise;
    }),
  };
  const onSucceeded = vi.fn();
  const onFailed = vi.fn();
  const scanSent = vi.fn();
  const instrumentedGate: ScanGate = {
    ...gate,
    alertOpened: spy("alertOpened", gate.alertOpened),
    alertCancelled: spy("alertCancelled", gate.alertCancelled),
    alertForced: spy("alertForced", gate.alertForced),
    sendFinished: spy("sendFinished", gate.sendFinished),
  };
  const choice = createBatchChoice({
    gate: instrumentedGate,
    service,
    rememberedBatches: RememberedBatchStore,
    isTracingEnabled: () => tracing,
    isBadgeValid: () => badgeValid,
    scanSent: spy("scanSent", scanSent),
    now: () => 5000,
  });
  const feedback = { onSucceeded: spy("onSucceeded", onSucceeded), onFailed: spy("onFailed", onFailed) };
  sendScan(gate);
  return {
    gate,
    calls,
    product,
    batches,
    withdrawals,
    service,
    onSucceeded,
    onFailed,
    scanSent,
    choice,
    start: () => choice.start(CODE, feedback),
    withdraw: (batch: Batch) => choice.withdraw(batch, feedback),
  };
}

function closeAndReopenCamera(harness: ReturnType<typeof setup>) {
  harness.choice.cameraClosed();
  harness.gate.cameraClosed(6000);
  harness.gate.cameraReopened();
}

async function openSheet(harness: ReturnType<typeof setup>, list: Batch[] = [LATE, EARLY]) {
  harness.start();
  harness.product.resolve(PRODUCT);
  await flush();
  harness.batches.resolve(list);
  await flush();
}

describe("createBatchChoice", () => {
  beforeEach(() => {
    RememberedBatchStore.forgetAll();
  });

  it("opens the sheet on the scanned product's batches, earliest expiry first (catches: sheet opened without the gate's alert, API order kept)", async () => {
    const harness = setup();

    harness.start();
    expect(harness.choice.getState()).toEqual({ kind: "loading" });
    harness.product.resolve(PRODUCT);
    await flush();
    expect(harness.service.getBatches).toHaveBeenCalledWith(42);
    harness.batches.resolve([LATE, EARLY]);
    await flush();

    expect(harness.choice.getState()).toEqual({
      kind: "open",
      stockId: 42,
      designation: "Fraise 856",
      batches: [EARLY, LATE],
    });
    expect(harness.calls).toEqual(["alertOpened"]);
    expect(harness.gate.isBusy()).toBe(true);
  });

  it("withdraws one unit from the chosen batch: scanSent, alertForced, the send, sendFinished, then onSucceeded (catches: alertForced dropped)", async () => {
    const harness = setup();
    await openSheet(harness);

    harness.withdraw(EARLY);
    expect(harness.choice.getState().kind).toBe("sending");
    expect(harness.service.withdrawFromBatch).toHaveBeenCalledWith(42, 9);
    harness.withdrawals[0].resolve({ message: "Sortie enregistrée" });
    await flush();

    expect(harness.calls).toEqual([
      "alertOpened",
      "scanSent",
      "alertForced",
      "withdrawFromBatch",
      "sendFinished",
      "onSucceeded",
    ]);
    expect(harness.onSucceeded).toHaveBeenCalledWith({ message: "Sortie enregistrée" });
    expect(harness.choice.getState()).toEqual({ kind: "closed" });
    expect(harness.gate.isBusy()).toBe(false);
  });

  it("withdraws once when Retirer is pressed again while the first send is pending (catches: double-press guard dropped)", async () => {
    const harness = setup();
    await openSheet(harness);

    harness.withdraw(EARLY);
    harness.withdraw(EARLY);
    harness.withdraw(LATE);

    expect(harness.service.withdrawFromBatch).toHaveBeenCalledTimes(1);
  });

  it("cancels without sending and frees the gate (catches: alertCancelled dropped)", async () => {
    const harness = setup();
    await openSheet(harness);

    harness.choice.cancel();

    expect(harness.calls).toEqual(["alertOpened", "alertCancelled"]);
    expect(harness.service.withdrawFromBatch).not.toHaveBeenCalled();
    expect(harness.choice.getState()).toEqual({ kind: "closed" });
    expect(harness.gate.isBusy()).toBe(false);
  });

  it("closes on an expired badge when the account traces, keeps the chosen batch and sends nothing (catches: sent anyway, alertCancelled dropped)", async () => {
    const harness = setup({ tracing: true, badgeValid: false });
    await openSheet(harness);

    harness.withdraw(LATE);

    expect(harness.service.withdrawFromBatch).not.toHaveBeenCalled();
    expect(harness.scanSent).not.toHaveBeenCalled();
    expect(harness.calls).toEqual(["alertOpened", "alertCancelled", "onFailed"]);
    expect(harness.onFailed).toHaveBeenCalledWith("Scannez votre badge, puis rescannez le produit.", "Badge expiré");
    expect(harness.choice.getState()).toEqual({ kind: "closed" });
    expect(harness.gate.isBusy()).toBe(false);
    expect(RememberedBatchStore.get(42)).toEqual({ batchNumber: "LT2291", expirationDate: "31-03-2028" });
  });

  it("sends without a badge when the account does not trace (catches: badge checked alone)", async () => {
    const harness = setup({ tracing: false, badgeValid: false });
    await openSheet(harness);

    harness.withdraw(EARLY);

    expect(harness.service.withdrawFromBatch).toHaveBeenCalledWith(42, 9);
  });

  it("shows the generic message and never asks for batches when no product carries the code (catches: batches asked for a missing product)", async () => {
    const harness = setup();

    harness.start();
    harness.product.resolve(null);
    await flush();

    expect(harness.service.getBatches).not.toHaveBeenCalled();
    expect(harness.calls).toEqual(["sendFinished", "onFailed"]);
    expect(harness.onFailed).toHaveBeenCalledWith("Erreur lors du scan du produit");
    expect(harness.choice.getState()).toEqual({ kind: "closed" });
    expect(harness.gate.isBusy()).toBe(false);
  });

  it("opens no sheet when the product has no batch in stock (catches: empty sheet opened)", async () => {
    const harness = setup();

    await openSheet(harness, []);

    expect(harness.calls).toEqual(["sendFinished", "onFailed"]);
    expect(harness.onFailed).toHaveBeenCalledWith("Aucun lot en stock pour ce produit : la sortie n'est pas faite.");
    expect(harness.choice.getState()).toEqual({ kind: "closed" });
    expect(harness.gate.isBusy()).toBe(false);
  });

  it.each([
    ["the product", (harness: ReturnType<typeof setup>) => harness.product.reject(new Error("timeout"))],
    [
      "the batches",
      async (harness: ReturnType<typeof setup>) => {
        harness.product.resolve(PRODUCT);
        await flush();
        harness.batches.reject(new Error("timeout"));
      },
    ],
  ])("opens no sheet when loading %s fails (catches: sheet opened or gate left busy on a load failure)", async (_, fail) => {
    const harness = setup();

    harness.start();
    await fail(harness);
    await flush();

    expect(harness.calls).toEqual(["sendFinished", "onFailed"]);
    expect(harness.onFailed).toHaveBeenCalledWith("Impossible de charger les lots : la sortie n'est pas faite.");
    expect(harness.choice.getState()).toEqual({ kind: "closed" });
    expect(harness.gate.isBusy()).toBe(false);
  });

  it.each([
    ["a batch choice (222)", { errorMessage: "RUPTURE STOCK : <br/>Fraise 856", code: 222 }],
    ["Stock detail already used", { errorMessage: "Stock detail already used", code: 0 }],
  ])("tells the batch was just used when the withdrawal is refused with %s, without a second sheet (catches: API message shown, sheet reopened)", async (_, data) => {
    const harness = setup();
    await openSheet(harness);

    harness.withdraw(EARLY);
    harness.withdrawals[0].reject({ response: { status: 400, data }, config: { headers: {} }, message: "refused" });
    await flush();

    expect(harness.onFailed).toHaveBeenCalledWith(
      "Ce lot vient d'être utilisé : rescannez le produit pour choisir un autre lot.",
      "Lot déjà utilisé",
    );
    expect(harness.onSucceeded).not.toHaveBeenCalled();
    expect(harness.calls.filter((call) => call === "alertOpened")).toHaveLength(1);
    expect(harness.choice.getState()).toEqual({ kind: "closed" });
    expect(harness.gate.isBusy()).toBe(false);
  });

  it("shows the API's message for any other refusal of the withdrawal (catches: every refusal read as a used batch)", async () => {
    const harness = setup();
    await openSheet(harness);

    harness.withdraw(EARLY);
    harness.withdrawals[0].reject({
      response: { status: 400, data: { errorMessage: "Produit périmé", code: 0 } },
      config: { headers: {} },
      message: "refused",
    });
    await flush();

    expect(harness.calls.slice(-2)).toEqual(["sendFinished", "onFailed"]);
    expect(harness.onFailed).toHaveBeenCalledWith("Produit périmé");
    expect(harness.gate.isBusy()).toBe(false);
  });

  it("cancels the open sheet when the camera closes, so the reopened camera scans (catches: nothing called on close)", async () => {
    const harness = setup();
    await openSheet(harness);

    closeAndReopenCamera(harness);

    expect(harness.calls).toEqual(["alertOpened", "alertCancelled"]);
    expect(harness.choice.getState()).toEqual({ kind: "closed" });
    expect(harness.gate.isBusy()).toBe(false);
  });

  it("frees the gate when the camera closes during loading, and a late answer shows nothing (catches: sendFinished skipped, late-answer guard dropped)", async () => {
    const harness = setup();
    harness.start();

    closeAndReopenCamera(harness);
    expect(harness.gate.isBusy()).toBe(false);
    harness.product.resolve(PRODUCT);
    await flush();
    harness.batches.resolve([EARLY]);
    await flush();

    expect(harness.calls).toEqual(["sendFinished"]);
    expect(harness.choice.getState()).toEqual({ kind: "closed" });
    expect(harness.gate.isBusy()).toBe(false);
  });

  it("frees the gate when the camera closes during the withdrawal, and a late answer calls nothing (catches: sendFinished skipped, late-answer guard dropped)", async () => {
    const harness = setup();
    await openSheet(harness);
    harness.withdraw(EARLY);

    closeAndReopenCamera(harness);
    expect(harness.gate.isBusy()).toBe(false);
    harness.withdrawals[0].resolve({ message: "Sortie enregistrée" });
    await flush();

    expect(harness.calls).toEqual(["alertOpened", "scanSent", "alertForced", "withdrawFromBatch", "sendFinished"]);
    expect(harness.onSucceeded).not.toHaveBeenCalled();
    expect(harness.choice.getState()).toEqual({ kind: "closed" });
  });

  it("ignores a late refusal of a withdrawal after the camera closed (catches: late-answer guard on success only)", async () => {
    const harness = setup();
    await openSheet(harness);
    harness.withdraw(EARLY);

    closeAndReopenCamera(harness);
    harness.withdrawals[0].reject({ response: { status: 400, data: {} }, message: "refused" });
    await flush();

    expect(harness.onFailed).not.toHaveBeenCalled();
    expect(harness.calls.filter((call) => call === "sendFinished")).toHaveLength(1);
  });

  it("puts the batch last withdrawn first after the camera closed, until the batches are forgotten (catches: forgotten on close)", async () => {
    const first = setup();
    await openSheet(first);
    first.withdraw(LATE);
    first.withdrawals[0].resolve({ message: "Sortie enregistrée" });
    await flush();
    closeAndReopenCamera(first);

    const second = setup();
    const lateUnderAnotherId = { ...LATE, stockDetailsId: 8, quantity: 2 };
    await openSheet(second, [EARLY, lateUnderAnotherId]);
    expect(second.choice.getState()).toMatchObject({ batches: [lateUnderAnotherId, EARLY] });

    second.choice.cancel();
    second.choice.forgetRememberedBatches();
    const third = setup();
    await openSheet(third, [lateUnderAnotherId, EARLY]);
    expect(third.choice.getState()).toMatchObject({ batches: [EARLY, lateUnderAnotherId] });
  });

  it("tells its subscribers each change of state, until they unsubscribe (catches: a change not notified, so the sheet never shows)", async () => {
    const harness = setup();
    const seen: string[] = [];
    const unsubscribe = harness.choice.subscribe(() => seen.push(harness.choice.getState().kind));

    await openSheet(harness);
    harness.withdraw(EARLY);
    unsubscribe();
    harness.withdrawals[0].resolve({ message: "Sortie enregistrée" });
    await flush();

    expect(seen).toEqual(["loading", "open", "sending"]);
  });
});
