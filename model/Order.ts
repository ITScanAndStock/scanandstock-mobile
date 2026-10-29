export type OrderStatus = "pending" | "partial" | "complete" | "closed";

export interface OrderProvider {
  name: string;
  comment?: string;
  additionalComment?: string;
}

export interface Order {
  orderId: number;
  orderDate: string;
  orderStatus: OrderStatus;
  orderStatusLabel?: string;
  orderPrice?: number;
  providers?: OrderProvider[];
  user?: string;
  receivers?: string[];
}

export interface OrderFilterValue {
  label: string;
  value: string;
  count: number;
}

export interface OrderFilter {
  filter: string;
  label: string;
  values: OrderFilterValue[];
}

export interface OrderResponse {
  content: Order[];
  filters?: OrderFilter[];
  total: number;
  filteredCount?: number;
}

export interface OrderItem {
  orderItemId: number;
  itemProductId: number;
  itemProviderId: number;
  itemDesignation: string;
  itemGtin?: string;
  itemType?: string;
  itemProviderName?: string;
  itemQuantity: number;
  itemPrice?: number;
  itemTotal?: number;
  itemDeliveredQuantity: number;
  receivers?: string[];
}

export interface OrderItemResponse {
  content: OrderItem[];
  total: number;
}
