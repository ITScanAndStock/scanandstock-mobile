import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import type { Order, OrderStatus } from "@/model/Order";
import { formatOrderDate } from "@/services/OrderDate";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "En cours",
  partial: "Partielle",
  complete: "Complète",
  closed: "Clôturée",
};

const STATUS_COLORS: Record<OrderStatus, { background: string; text: string }> = {
  pending: { background: colors.STATUS_PENDING_BG, text: colors.STATUS_PENDING_TEXT },
  partial: { background: colors.STATUS_PARTIAL_BG, text: colors.STATUS_PARTIAL_TEXT },
  complete: { background: colors.INCREASE_BG, text: colors.INCREASE_TEXT },
  closed: { background: colors.BORDER, text: colors.MUTED },
};

export function formatPrice(price: number | undefined): string | null {
  if (price === undefined) {
    return null;
  }
  return price.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function orderStatusLabel(order: Order): string {
  return order.orderStatusLabel ?? STATUS_LABELS[order.orderStatus];
}

export function providerNames(order: Order): string {
  return (order.providers ?? []).map((provider) => provider.name).join(", ");
}

export function OrderStatusPill({ order }: { order: Order }) {
  const statusColors = STATUS_COLORS[order.orderStatus];
  return (
    <View style={[styles.status, { backgroundColor: statusColors.background }]}>
      <Text style={[styles.statusText, { color: statusColors.text }]}>{orderStatusLabel(order)}</Text>
    </View>
  );
}

type OrderCardProps = { order: Order; onPress: () => void; selected?: boolean };

export default function OrderCard({ order, onPress, selected = false }: OrderCardProps) {
  const date = formatOrderDate(order.orderDate);
  const status = orderStatusLabel(order);
  const providers = providerNames(order);
  const meta = [formatPrice(order.orderPrice), order.user ? `passée par ${order.user}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed, selected && styles.cardSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={[`Commande du ${date}`, status, providers, meta].filter(Boolean).join(", ")}
    >
      <View style={styles.top}>
        <Text style={styles.date}>Commande du {date}</Text>
        <OrderStatusPill order={order} />
      </View>
      {providers ? (
        <Text style={styles.providers} numberOfLines={1} ellipsizeMode="tail">
          {providers}
        </Text>
      ) : null}
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.WHITE,
    borderWidth: 1,
    borderColor: colors.OPTION_BORDER,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  cardPressed: {
    backgroundColor: colors.OPTION_SELECTED_BG,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: colors.GREEN_DARK,
    backgroundColor: colors.OPTION_SELECTED_BG,
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  date: {
    flexShrink: 1,
    color: colors.DARK,
    fontSize: 15,
    fontFamily: "SemiBold",
  },
  status: {
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  statusText: {
    fontSize: 12,
    fontFamily: "SemiBold",
  },
  providers: {
    marginTop: 6,
    color: colors.TEXT_SECONDARY,
    fontSize: 13,
    fontFamily: "Montserrat",
  },
  meta: {
    marginTop: 4,
    color: colors.MUTED,
    fontSize: 12,
    fontFamily: "Montserrat",
  },
});
