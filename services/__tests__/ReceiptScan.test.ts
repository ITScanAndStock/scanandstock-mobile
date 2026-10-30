import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderItem } from "../../model/Order";
import HeaderStore from "../../state/HeaderStore";
import { createReceiptDraft } from "../ReceiptDraft";
import type { ApplyCode, Recognition } from "../ReceiptRecognizer";
import { createReceiptScan } from "../ReceiptScan";

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const GTIN = "3401234567890";
const ITEM: OrderItem = {
  orderItemId: 1,
  itemProductId: 10,
  itemProviderId: 7,
  itemDesignation: "Composite Filtek Z250 A2",
  itemGtin: GTIN,
  itemQuantity: 6,
  itemDeliveredQuantity: 0,
};

let clock = 1000;
function show(receipt: ReturnType<typeof createReceiptScan>, code: string) {
  for (let frame = 0; frame < 3; frame += 1) {
    receipt.frame(code, (clock += 10));
  }
}

function setup() {
  const draft = createReceiptDraft([ITEM]);
  const answers: Deferred<void>[] = [];
  const results: (Recognition | null)[] = [];
  const recognize = vi.fn((_code: string, group: number, apply: ApplyCode) => {
    const answer = deferred<void>();
    answers.push(answer);
    return answer.promise.then(() => results.shift() ?? apply({ group, gtin: GTIN }));
  });
  const onRecognized = vi.fn();
  const onAccountChanged = vi.fn();
  const receipt = createReceiptScan({ draft, recognize, onRecognized, onAccountChanged });
  return { draft, answers, results, recognize, onRecognized, onAccountChanged, receipt };
}

describe("ReceiptScan", () => {
  beforeEach(() => {
    HeaderStore.setAccountId("12");
  });

  it("lets the next code go once a recognition fails (catches: sendFinished only on success)", async () => {
    const { answers, results, recognize, onRecognized, receipt } = setup();

    show(receipt, "AAAA-1");
    results.push({ kind: "unverifiable" });
    answers[0].resolve();
    await flush();
    show(receipt, "BBBB-2");

    expect(onRecognized).toHaveBeenCalledWith({ kind: "unverifiable" });
    expect(recognize).toHaveBeenCalledTimes(2);
    expect(recognize.mock.calls[1][0]).toBe("BBBB-2");
  });

  it("counts two boxes apart twice and the two codes of one box once (catches: one group for every code, a new group per code)", async () => {
    const { draft, answers, receipt } = setup();

    show(receipt, "AAAA-1");
    answers[0].resolve();
    await flush();
    clock += 2000;
    show(receipt, "BBBB-2");
    answers[1].resolve();
    await flush();
    const afterTwoBoxes = draft.count();
    show(receipt, "CCCC-3");
    answers[2].resolve();
    await flush();

    expect(afterTwoBoxes).toBe(2);
    expect(draft.count()).toBe(2);
  });

  it("counts nothing from a recognition answered after the receipt closed (catches: answer applied)", async () => {
    const { draft, answers, onRecognized, receipt } = setup();

    show(receipt, GTIN);
    receipt.close();
    answers[0].resolve();
    await flush();

    expect(draft.count()).toBe(0);
    expect(onRecognized).not.toHaveBeenCalled();
  });

  it("shows nothing from a failure answered after the receipt closed (catches: answer shown)", async () => {
    const { answers, results, onRecognized, receipt } = setup();

    show(receipt, GTIN);
    receipt.close();
    results.push({ kind: "unverifiable" });
    answers[0].resolve();
    await flush();

    expect(onRecognized).not.toHaveBeenCalled();
  });

  it("asks nothing and leaves when the active account is no longer the receipt's (catches: account guard removed)", () => {
    const { recognize, onAccountChanged, receipt } = setup();

    HeaderStore.setAccountId("34");
    show(receipt, GTIN);

    expect(recognize).not.toHaveBeenCalled();
    expect(onAccountChanged).toHaveBeenCalledTimes(1);
  });

  it("counts no code shown while the line sheet is open (catches: frames passed to the gate with the sheet open)", () => {
    const { recognize, receipt } = setup();

    expect(receipt.openSheet(clock)).toBe(true);
    show(receipt, GTIN);

    expect(recognize).not.toHaveBeenCalled();
  });

  it("does not open the sheet while a recognition is in flight (catches: sheet opened during a recognition)", async () => {
    const { draft, answers, receipt } = setup();

    show(receipt, GTIN);
    const opened = receipt.openSheet(clock);
    answers[0].resolve();
    await flush();

    expect(opened).toBe(false);
    expect(draft.count()).toBe(1);
    expect(receipt.openSheet(clock)).toBe(true);
  });

  it("does not open a second sheet over an open one (catches: sheet opened while one is open)", () => {
    const { receipt } = setup();

    receipt.openSheet(clock);

    expect(receipt.openSheet(clock)).toBe(false);
  });

  it("does not count again the box still in view when the sheet closes (catches: cameraClosed or cameraReopened not called)", async () => {
    const { answers, recognize, receipt } = setup();

    show(receipt, GTIN);
    answers[0].resolve();
    await flush();
    receipt.openSheet((clock += 200));
    clock += 10000;
    receipt.closeSheet();
    show(receipt, GTIN);

    expect(recognize).toHaveBeenCalledTimes(1);
  });

  it("counts again a box that had left before the sheet opened (catches: cameraClosed not called)", async () => {
    const { answers, recognize, receipt } = setup();

    show(receipt, GTIN);
    answers[0].resolve();
    await flush();
    receipt.openSheet((clock += 3000));
    clock += 2000;
    receipt.closeSheet();
    show(receipt, GTIN);

    expect(recognize).toHaveBeenCalledTimes(2);
  });

  it("takes a code still held by the previous receipt in the next one (catches: one gate shared by every receipt)", () => {
    const first = setup();
    show(first.receipt, GTIN);
    first.receipt.close();

    const second = setup();
    show(second.receipt, GTIN);

    expect(second.recognize).toHaveBeenCalledTimes(1);
  });
});
