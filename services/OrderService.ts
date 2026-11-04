import type { AxiosResponse } from "axios";
import type { Order, OrderFilter, OrderItem, OrderItemResponse, OrderResponse } from "../model/Order";
import apiClient from "./ApiService";
import type { ReceiveBody } from "./ReceiptDraft";

const ORDER_PAGE_SIZE = 20;

const MAX_PAGES_PER_STATUS = 10;

// A large receipt can take the server longer than the client's default 15 s.
const RECEIVE_TIMEOUT_MS = 60000;

const TO_RECEIVE_STATUSES = ["En cours", "Partielle"] as const;

export type OrderPage = { orders: Order[]; hasMore: boolean; nextOffset: number };

// complete is false when a status had more pages than MAX_PAGES_PER_STATUS: an order missing from it may still be open.
export type OrdersToReceive = { orders: Order[]; count: number; complete: boolean };

// The API sorts on the date alone, with no tie-breaker: an order can come back on two pages.
export function appendOrders(loaded: readonly Order[], incoming: readonly Order[]): Order[] {
  const seen = new Set(loaded.map((order) => order.orderId));
  return [...loaded, ...incoming.filter((order) => !seen.has(order.orderId) && seen.add(order.orderId))];
}

export class AccountChangedError extends Error {}

// The Account-Id header is read when the request leaves, after the token wait: an account switch can slip in between.
function sentUnder<T>(accountId: string, response: AxiosResponse<T>): T | null {
  if (String(response.config.headers?.["Account-Id"]) !== String(accountId)) {
    throw new AccountChangedError();
  }
  return response.status === 204 ? null : response.data;
}

async function fetchPage(accountId: string, offset: number, status?: string): Promise<OrderResponse | null> {
  const params: Record<string, string | number> = { "page.size": ORDER_PAGE_SIZE, "page.offset": offset };
  if (status) {
    params.filters = "orderStatus";
    params.filterValues = status;
  }
  return sentUnder(accountId, await apiClient.get<OrderResponse>("/order", { params }));
}

type StatusList = { orders: Order[]; filters?: OrderFilter[]; complete: boolean };

async function fetchStatus(accountId: string, status: string): Promise<StatusList> {
  let orders: Order[] = [];
  let filters: OrderFilter[] | undefined;
  for (let pageIndex = 0; pageIndex < MAX_PAGES_PER_STATUS; pageIndex++) {
    const offset = pageIndex * ORDER_PAGE_SIZE;
    const page = await fetchPage(accountId, offset, status);
    if (!page) {
      return { orders, filters, complete: true };
    }
    orders = appendOrders(orders, page.content);
    filters ??= page.filters;
    if (offset + ORDER_PAGE_SIZE >= (page.filteredCount ?? page.total)) {
      return { orders, filters, complete: true };
    }
  }
  return { orders, filters, complete: false };
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
      complete: pending.complete && partial.complete,
    };
  }

  async getOrderItems(accountId: string, orderId: number): Promise<OrderItem[]> {
    const response = sentUnder(accountId, await apiClient.get<OrderItemResponse>(`/order/${orderId}`));
    return response?.content ?? [];
  }

  // The interceptor reads the active account after awaiting the token: a write cannot wait to learn whose it was.
  async receiveOrder(accountId: string, orderId: number, body: ReceiveBody): Promise<void> {
    await apiClient.post(`/order/${orderId}/receive`, body, {
      timeout: RECEIVE_TIMEOUT_MS,
      headers: { "Account-Id": accountId },
    });
  }
}

export default new OrderService();
