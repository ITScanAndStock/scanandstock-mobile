import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order, OrderResponse } from "../../model/Order";
import apiClient from "../ApiService";
import OrderService, { AccountChangedError } from "../OrderService";

vi.mock("../ApiService", () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockedApi = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
};

function order(orderId: number, orderDate: string): Order {
  return { orderId, orderDate, orderStatus: "pending" };
}

function ordersFrom(firstId: number, count: number): Order[] {
  return Array.from({ length: count }, (_, i) => order(firstId + i, `2026-09-${String(28 - i).padStart(2, "0")} 08:00:00+00:00`));
}

const ACCOUNT = "12";

// The API sends account ids as numbers, typed string in model/Account.ts; the interceptor copies them as they are.
const SENT_UNDER_ACCOUNT = { headers: { "Account-Id": 12 } };

function ok(content: Order[], filteredCount: number, config: { headers: Record<string, unknown> } = SENT_UNDER_ACCOUNT) {
  const data: OrderResponse = { content, total: filteredCount, filteredCount };
  return { status: 200, data, config };
}

const NO_CONTENT = { status: 204, data: "", config: SENT_UNDER_ACCOUNT };

type StatusCounts = { "En cours": number; Partielle: number };

// Serves GET /order like the API: one list per orderStatus filter value, paged by element index, and status
// counts computed without the request's filter, hence the same counts in every non-empty response.
function serveByStatus(lists: Record<string, Order[]>, counts: StatusCounts) {
  mockedApi.get.mockImplementation(async (url: string, config: { params: Record<string, string | number> }) => {
    expect(url).toBe("/order");
    const { params } = config;
    expect(params.filters).toBe("orderStatus");
    const list = lists[String(params.filterValues)] ?? [];
    const offset = Number(params["page.offset"]);
    const content = list.slice(offset, offset + Number(params["page.size"]));
    if (content.length === 0) {
      return NO_CONTENT;
    }
    const data: OrderResponse = {
      content,
      total: 999,
      filteredCount: list.length,
      filters: [
        {
          filter: "orderStatus",
          label: "Statut",
          values: [
            { label: "En cours", value: "En cours", count: counts["En cours"] },
            { label: "Partielle", value: "Partielle", count: counts.Partielle },
            { label: "Complète", value: "Complète", count: 40 },
          ],
        },
      ],
    };
    return { status: 200, data, config: SENT_UNDER_ACCOUNT };
  });
}

describe("OrderService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("keeps orders sent under the account asked for, its id a number at runtime (catches: account ids compared strictly)", async () => {
    mockedApi.get.mockResolvedValueOnce(ok(ordersFrom(100, 3), 3));

    const page = await OrderService.getOrdersPage(ACCOUNT, 0);

    expect(page.orders).toHaveLength(3);
  });

  it("reads a 204 as an empty list (catches: no 204 branch, the empty body read as a response)", async () => {
    mockedApi.get.mockResolvedValueOnce(NO_CONTENT);

    const page = await OrderService.getOrdersPage(ACCOUNT, 0);

    expect(page).toEqual({ orders: [], hasMore: false, nextOffset: 0 });
  });

  it("pages every order from element 20 after a first page of 20 (catches: next offset as a page number; end read before filteredCount)", async () => {
    mockedApi.get.mockResolvedValueOnce(ok(ordersFrom(100, 20), 21));

    const page = await OrderService.getOrdersPage(ACCOUNT, 0);

    expect(mockedApi.get).toHaveBeenCalledWith("/order", { params: { "page.size": 20, "page.offset": 0 } });
    expect(page.hasMore).toBe(true);
    expect(page.nextOffset).toBe(20);
  });

  it("merges the pending and partial orders by date, newest first (catches: the two lists concatenated)", async () => {
    serveByStatus(
      {
        "En cours": [order(4, "2026-10-20 08:00:00+00:00"), order(2, "2026-10-12 08:00:00+00:00")],
        Partielle: [order(3, "2026-10-15 08:00:00+00:00"), order(1, "2026-10-01 08:00:00+00:00")],
      },
      { "En cours": 2, Partielle: 2 },
    );

    const { orders } = await OrderService.getOrdersToReceive(ACCOUNT);

    expect(orders.map((o) => o.orderId)).toEqual([4, 3, 2, 1]);
  });

  it("loads a list to its end, over two pages (catches: first page only)", async () => {
    serveByStatus({ "En cours": ordersFrom(100, 21) }, { "En cours": 21, Partielle: 0 });

    const { orders } = await OrderService.getOrdersToReceive(ACCOUNT);

    expect(orders).toHaveLength(21);
  });

  it("asks the second page from element 20 (catches: page.offset sent as a page number)", async () => {
    serveByStatus({ "En cours": ordersFrom(100, 21) }, { "En cours": 21, Partielle: 0 });

    await OrderService.getOrdersToReceive(ACCOUNT);

    const pendingOffsets = mockedApi.get.mock.calls
      .filter(([, config]) => config.params.filterValues === "En cours")
      .map(([, config]) => config.params["page.offset"]);
    expect(pendingOffsets).toEqual([0, 20]);
  });

  it("shows an order served on two pages once (catches: no deduplication by orderId)", async () => {
    const firstPage = ordersFrom(100, 20);
    const shifted = [...firstPage, firstPage[19], order(120, "2026-08-01 08:00:00+00:00")];
    serveByStatus({ "En cours": shifted }, { "En cours": 22, Partielle: 0 });

    const { orders } = await OrderService.getOrdersToReceive(ACCOUNT);

    expect(orders.map((o) => o.orderId)).toEqual([...firstPage.map((o) => o.orderId), 120]);
  });

  it("counts the orders to receive from the API's status counts, read once (catches: N taken as the list length; N summed over both responses)", async () => {
    serveByStatus(
      {
        "En cours": [order(4, "2026-10-20 08:00:00+00:00"), order(2, "2026-10-12 08:00:00+00:00")],
        Partielle: [order(3, "2026-10-15 08:00:00+00:00")],
      },
      { "En cours": 5, Partielle: 3 },
    );

    const { count } = await OrderService.getOrdersToReceive(ACCOUNT);

    expect(count).toBe(8);
  });

  it("reads the counts from the partial list when no order is pending (catches: counts read in the first response only)", async () => {
    serveByStatus({ Partielle: [order(3, "2026-10-15 08:00:00+00:00")] }, { "En cours": 0, Partielle: 1 });

    const { orders, count } = await OrderService.getOrdersToReceive(ACCOUNT);

    expect(orders.map((o) => o.orderId)).toEqual([3]);
    expect(count).toBe(1);
  });

  it("counts nothing when both lists are empty (catches: counts read from a response that is not there)", async () => {
    mockedApi.get.mockResolvedValue(NO_CONTENT);

    expect(await OrderService.getOrdersToReceive(ACCOUNT)).toEqual({ orders: [], count: 0 });
  });

  it("refuses orders sent under another account than the one asked for (catches: the account switched while the request waited for its token)", async () => {
    mockedApi.get.mockResolvedValueOnce(ok(ordersFrom(100, 3), 3, { headers: { "Account-Id": "34" } }));

    await expect(OrderService.getOrdersPage(ACCOUNT, 0)).rejects.toThrow(AccountChangedError);
  });
});
