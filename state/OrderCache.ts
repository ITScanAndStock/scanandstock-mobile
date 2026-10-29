import type { Order } from "@/model/Order";

const ordersByAccount = new Map<string, Map<number, Order>>();

const OrderCache = {
  remember(accountId: string, orders: readonly Order[]) {
    const known = ordersByAccount.get(accountId) ?? new Map<number, Order>();
    orders.forEach((order) => known.set(order.orderId, order));
    ordersByAccount.set(accountId, known);
  },
  get(accountId: string, orderId: number) {
    return ordersByAccount.get(accountId)?.get(orderId);
  },
};

export default OrderCache;
