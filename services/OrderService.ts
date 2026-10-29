import type { Order, OrderFilter, OrderResponse } from "../model/Order";
import apiClient from "./ApiService";

const ORDER_PAGE_SIZE = 20;

const MAX_PAGES_PER_STATUS = 10;

const TO_RECEIVE_STATUSES = ["En cours", "Partielle"] as const;

export type OrderPage = { orders: Order[]; hasMore: boolean; nextOffset: number };

export type OrdersToReceive = { orders: Order[]; count: number };

// The API sorts on the date alone, with no tie-breaker: an order can come back on two pages.
export function appendOrders(loaded: readonly Order[], incoming: readonly Order[]): Order[] {
  const seen = new Set(loaded.map((order) => order.orderId));
  return [...loaded, ...incoming.filter((order) => !seen.has(order.orderId) && seen.add(order.orderId))];
}

export class AccountChangedError extends Error {}

// The Account-Id header is read when the request leaves, after the token wait: an account switch can slip in between.
async function fetchPage(accountId: string, offset: number, status?: string): Promise<OrderResponse | null> {
  const params: Record<string, string | number> = { "page.size": ORDER_PAGE_SIZE, "page.offset": offset };
  if (status) {
    params.filters = "orderStatus";
    params.filterValues = status;
  }
  const response = await apiClient.get<OrderResponse>("/order", { params });
  if (String(response.config.headers?.["Account-Id"]) !== String(accountId)) {
    throw new AccountChangedError();
  }
  return response.status === 204 ? null : response.data;
}

type StatusList = { orders: Order[]; filters?: OrderFilter[] };

async function fetchStatus(accountId: string, status: string): Promise<StatusList> {
  let orders: Order[] = [];
  let filters: OrderFilter[] | undefined;
  for (let pageIndex = 0; pageIndex < MAX_PAGES_PER_STATUS; pageIndex++) {
    const offset = pageIndex * ORDER_PAGE_SIZE;
    const page = await fetchPage(accountId, offset, status);
    if (!page) {
      break;
    }
    orders = appendOrders(orders, page.content);
    filters ??= page.filters;
    if (offset + ORDER_PAGE_SIZE >= (page.filteredCount ?? page.total)) {
      break;
    }
  }
  return { orders, filters };
}

// The API computes its status counts without the request's filter: every non-empty response carries the same ones.
function countToReceive(filters: OrderFilter[] | undefined): number {
  const statusValues = filters?.find((filter) => filter.filter === "orderStatus")?.values ?? [];
  return statusValues
    .filter((value) => (TO_RECEIVE_STATUSES as readonly string[]).includes(value.value))
    .reduce((sum, value) => sum + value.count, 0);
}

function newestFirst(a: Order, b: Order): number {
  if (a.orderDate === b.orderDate) {
    return b.orderId - a.orderId;
  }
  return a.orderDate < b.orderDate ? 1 : -1;
}

class OrderService {
  async getOrdersPage(accountId: string, offset: number): Promise<OrderPage> {
    const page = await fetchPage(accountId, offset);
    if (!page) {
      return { orders: [], hasMore: false, nextOffset: offset };
    }
    const nextOffset = offset + ORDER_PAGE_SIZE;
    return { orders: page.content, hasMore: nextOffset < (page.filteredCount ?? page.total), nextOffset };
  }

  async getOrdersToReceive(accountId: string): Promise<OrdersToReceive> {
    const [pending, partial] = await Promise.all(TO_RECEIVE_STATUSES.map((status) => fetchStatus(accountId, status)));
    return {
      orders: appendOrders(pending.orders, partial.orders).sort(newestFirst),
      count: countToReceive(pending.filters ?? partial.filters),
    };
  }
}

export default new OrderService();
