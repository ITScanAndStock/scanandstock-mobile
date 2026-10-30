import { StyleSheet, Text, View } from "react-native";

import { colors } from "../constants/colors";
import { useOrderItems } from "../hooks/useOrderItems";
import type { Order } from "../model/Order";
import { formatOrderDate } from "../services/OrderDate";
import { orderProgress } from "../services/OrderProgress";
import { formatPrice, providerNames } from "./OrderCard";
import OrderItemsBody from "./OrderItemsBody";
import ReceptionNote from "./ReceptionNote";

type OrderDetailPaneProps = {
  accountId: string | undefined;
  order: Order | undefined;
  tableLayout: boolean;
};

export default function OrderDetailPane({ accountId, order, tableLayout }: OrderDetailPaneProps) {
  const { items, failed, retry } = useOrderItems(accountId, order);

  if (!order) {
    return null;
  }

  const progress = items ? orderProgress(items) : null;
  const summary = [
    providerNames(order),
    formatPrice(order.orderPrice),
    order.user ? `passée par ${order.user}` : null,
    progress ? `reçus ${progress.received} / ${progress.ordered}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.detail}>
      <View>
        <Text style={styles.title} accessibilityRole="header">
          Commande du {formatOrderDate(order.orderDate)}
        </Text>
        {summary ? <Text style={styles.summary}>{summary}</Text> : null}
      </View>
      <OrderItemsBody
        items={items}
        failed={failed}
        onRetry={retry}
        tableLayout={tableLayout}
        contentContainerStyle={styles.lines}
      />
      <ReceptionNote order={order} />
    </View>
  );
}

const styles = StyleSheet.create({
  detail: {
    flex: 1,
    gap: 14,
    minHeight: 0,
  },
  title: {
    color: colors.DARK,
    fontSize: 22,
    fontFamily: "SemiBold",
  },
  summary: {
    marginTop: 4,
    color: colors.MUTED,
    fontSize: 14,
    fontFamily: "Montserrat",
  },
  lines: {
    paddingBottom: 16,
  },
});
