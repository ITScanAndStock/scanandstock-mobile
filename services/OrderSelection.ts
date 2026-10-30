import type { Order } from "../model/Order";

export function shownOrder(chosenOrderId: number | undefined, shown: readonly Order[] | undefined): Order | undefined {
  return shown?.find((order) => order.orderId === chosenOrderId) ?? shown?.[0];
}
