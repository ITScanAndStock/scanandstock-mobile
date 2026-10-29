import { StyleSheet, Text, View } from "react-native";

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

function formatPrice(price: number | undefined): string | null {
  if (price === undefined) {
    return null;
  }
  return price.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export default function OrderCard({ order }: { order: Order }) {
  const date = formatOrderDate(order.orderDate);
  const status = order.orderStatusLabel ?? STATUS_LABELS[order.orderStatus];
  const statusColors = STATUS_COLORS[order.orderStatus];
  const providers = (order.providers ?? []).map((provider) => provider.name).join(", ");
  const meta = [formatPrice(order.orderPrice), order.user ? `passée par ${order.user}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <View
      style={styles.card}
      accessible={true}
      accessibilityLabel={[`Commande du ${date}`, status, providers, meta].filter(Boolean).join(", ")}
    >
      <View style={styles.top}>
        <Text style={styles.date}>Commande du {date}</Text>
        <View style={[styles.status, { backgroundColor: statusColors.background }]}>
          <Text style={[styles.statusText, { color: statusColors.text }]}>{status}</Text>
        </View>
      </View>
      {providers ? (
        <Text style={styles.providers} numberOfLines={1} ellipsizeMode="tail">
          {providers}
        </Text>
      ) : null}
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
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
