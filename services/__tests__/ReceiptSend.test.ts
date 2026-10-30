import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderItem } from "../../model/Order";
import HeaderStore from "../../state/HeaderStore";
import apiClient from "../ApiService";
import ReceiptResults from "../../state/ReceiptResults";
import { createReceiptDraft } from "../ReceiptDraft";
import { createReceiptSend } from "../ReceiptSend";

vi.mock("../ApiService", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedApi = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const ORDER_ID = 42;

const ITEM: OrderItem = {
  orderItemId: 7,
  itemProductId: 500,
  itemProviderId: 3,
  itemDesignation: "Composite Filtek Z250 A2",
  itemQuantity: 6,
  itemDeliveredQuantity: 1,
};

const SENT_UNDER_ACCOUNT = { headers: { "Account-Id": 12 } };

function linesServed(items: OrderItem[]) {
  return { status: 200, data: { content: items, total: items.length }, config: SENT_UNDER_ACCOUNT };
}

function refusal(status: number, headers: Record<string, unknown> = {}) {
  return { response: { status, data: "" }, config: { headers } };
}

const NO_RESPONSE = { request: {}, config: { headers: {} } };

function setup() {
  const draft = createReceiptDraft([ITEM]);
  draft.addBatch(7, { quantity: 2, batchNumber: "LT2291", expiration: { day: 31, month: 3, year: 2028 } });
  const refreshMovements = vi.fn();
  const scanSent = vi.fn();
  const sender = createReceiptSend({ draft, orderId: ORDER_ID, refreshMovements, scanSent });
  return { draft, refreshMovements, scanSent, sender };
}

describe("ReceiptSend", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    HeaderStore.setAccountId("12");
    HeaderStore.setTracingEnabled(true);
    mockedApi.get.mockResolvedValue(linesServed([ITEM]));
    mockedApi.post.mockResolvedValue({ status: 200, data: "" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends the draft's body for the order once it is reloaded unchanged (catches: body altered)", async () => {
    const { sender } = setup();

    const outcome = await sender.send();

    expect(outcome.kind).toBe("sent");
    expect(mockedApi.get).toHaveBeenCalledWith(`/order/${ORDER_ID}`);
    expect(mockedApi.post).toHaveBeenCalledWith(
      `/order/${ORDER_ID}/receive`,
      {
        items: [
          {
            orderItemId: 7,
            itemProductId: 500,
            itemProviderId: 3,
            batches: [{ quantity: 2, batchNumber: "LT2291", expirationDate: "31-03-2028" }],
          },
        ],
      },
      { timeout: 60000, headers: { "Account-Id": "12" } },
    );
  });

  it("holds the receipt back when a line was received meanwhile, its scans removed (catches: reload before sending removed)", async () => {
    mockedApi.get.mockResolvedValue(linesServed([{ ...ITEM, itemDeliveredQuantity: 3 }]));
    const { draft, sender } = setup();

    const outcome = await sender.send();

    expect(outcome).toEqual({ kind: "linesChanged", count: 1 });
    expect(mockedApi.post).not.toHaveBeenCalled();
    expect(draft.count()).toBe(0);
  });

  it("sends nothing once the active account changed during the reload (catches: account guard removed)", async () => {
    mockedApi.get.mockImplementation(async () => {
      HeaderStore.setAccountId("34");
      return linesServed([ITEM]);
    });
    const { sender } = setup();

    const outcome = await sender.send();

    expect(outcome.kind).toBe("accountChanged");
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it("sends once when pressed again while the first send runs (catches: sending guard removed)", async () => {
    const reload = deferred<ReturnType<typeof linesServed>>();
    mockedApi.get.mockReturnValueOnce(reload.promise);
    const { sender } = setup();

    const first = sender.send();
    const second = await sender.send();
    reload.resolve(linesServed([ITEM]));
    await first;

    expect(second.kind).toBe("busy");
    expect(mockedApi.post).toHaveBeenCalledTimes(1);
  });

  it("never sends again a receipt already recorded (catches: sending guard released after a success)", async () => {
    const { sender } = setup();

    await sender.send();
    const again = await sender.send();

    expect(again.kind).toBe("busy");
    expect(mockedApi.post).toHaveBeenCalledTimes(1);
  });

  it("tells a 403 that the receipt is for authorised people (catches: another case's message)", async () => {
    mockedApi.post.mockRejectedValueOnce(refusal(403));
    const { sender } = setup();

    expect(await sender.send()).toEqual({
      kind: "failed",
      toast: ["La réception est réservée aux personnes habilitées de votre cabinet"],
    });
  });

  it("returns a 417 sent with a badge as a refused badge, with what movementErrorToast says of it (catches: 417 returned as a plain failure, another case's message, badge read as not sent)", async () => {
    mockedApi.post.mockRejectedValueOnce(refusal(417, { "Badge-Id": "BADGE-1" }));
    const { sender } = setup();

    const outcome = await sender.send();

    expect(outcome.kind === "badgeRefused" && outcome.toast[1]).toBe("Badge refusé");
  });

  it("restarts the badge timer when the receipt is posted, not before (catches: scanSent not called, called on a send stopped before the POST)", async () => {
    const { draft, scanSent, sender } = setup();
    mockedApi.get.mockResolvedValueOnce(linesServed([{ ...ITEM, itemDeliveredQuantity: 2 }]));

    await sender.send();
    const afterStoppedSend = scanSent.mock.calls.length;
    draft.addBatch(7, { quantity: 1, batchNumber: "LT2291", expiration: { day: 31, month: 3, year: 2028 } });
    mockedApi.get.mockResolvedValueOnce(linesServed([{ ...ITEM, itemDeliveredQuantity: 2 }]));
    await sender.send();

    expect(afterStoppedSend).toBe(0);
    expect(scanSent).toHaveBeenCalledTimes(1);
    expect(mockedApi.post).toHaveBeenCalledTimes(1);
  });

  it.each([400, 402, 500])(
    "tells a %i that the receipt was not recorded (catches: another case's message)",
    async (status) => {
      mockedApi.post.mockRejectedValueOnce(refusal(status));
      const { sender } = setup();

      expect(await sender.send()).toEqual({ kind: "failed", toast: ["La réception n'a pas pu être enregistrée"] });
    },
  );

  it("keeps the draft after a refusal, sent whole on the next try (catches: draft emptied on an error)", async () => {
    mockedApi.post.mockRejectedValueOnce(refusal(500));
    const { draft, sender } = setup();
    const body = draft.receiveBody();

    await sender.send();
    const retried = await sender.send();

    expect(retried.kind).toBe("sent");
    expect(mockedApi.post).toHaveBeenLastCalledWith(`/order/${ORDER_ID}/receive`, body, {
      timeout: 60000,
      headers: { "Account-Id": "12" },
    });
  });

  it("marks the draft as an uncertain send when no answer comes, and never sends again by itself (catches: another case's message; marker not set; automatic retry)", async () => {
    mockedApi.post.mockRejectedValueOnce(NO_RESPONSE);
    const { draft, sender } = setup();

    const outcome = await sender.send();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(outcome).toEqual({
      kind: "failed",
      toast: ["La réception a peut-être été enregistrée : rouvrez la commande pour vérifier.", "Pas de réponse du serveur"],
    });
    expect(draft.marks().uncertainSend).toBe(true);
    expect(mockedApi.post).toHaveBeenCalledTimes(1);
  });

  it("asks for a confirmation before sending a draft marked uncertain, and sends once given (catches: confirmation skipped)", async () => {
    const { draft, sender } = setup();
    draft.setMarks({ uncertainSend: true });

    const unconfirmed = await sender.send();
    expect(unconfirmed.kind).toBe("confirmUncertain");
    expect(mockedApi.post).not.toHaveBeenCalled();

    const confirmed = await sender.send(true);
    expect(confirmed.kind).toBe("sent");
    expect(mockedApi.post).toHaveBeenCalledTimes(1);
  });

  it("reloads the home movements now and 2 s after a receipt is recorded (catches: the later reload removed)", async () => {
    vi.useFakeTimers();
    const { refreshMovements, sender } = setup();

    await sender.send();
    expect(refreshMovements).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2000);

    expect(refreshMovements).toHaveBeenCalledTimes(2);
  });

  it("keeps for the confirmation what is left after the reload (catches: result taken before the reload)", async () => {
    mockedApi.get.mockResolvedValue(linesServed([{ ...ITEM, itemQuantity: 8 }]));
    const { sender } = setup();

    await sender.send();

    expect(ReceiptResults.get("12", ORDER_ID)?.remaining).toEqual([
      { orderItemId: 7, designation: "Composite Filtek Z250 A2", quantity: 5 },
    ]);
  });

  it("keeps for the confirmation what was sent, not a code recognised during the POST (catches: result taken after the POST)", async () => {
    const posted = deferred<{ status: number; data: string }>();
    mockedApi.post.mockReturnValueOnce(posted.promise);
    const { draft, sender } = setup();

    const sending = sender.send();
    await vi.waitFor(() => expect(mockedApi.post).toHaveBeenCalled());
    draft.addBatch(7, { quantity: 1 });
    posted.resolve({ status: 200, data: "" });
    await sending;

    expect(ReceiptResults.get("12", ORDER_ID)?.entered).toBe(2);
  });
});
