import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import {
  COMMANDE_STATUS_LABEL,
  Commande,
  CommandeStatus,
  formatCommandeAmount,
  formatCommandeTitle,
} from "@/model/Commande";

const STATUS_STYLES: Record<CommandeStatus, { backgroundColor: string; color: string }> = {
  en_cours: {
    backgroundColor: colors.STATUS_EN_COURS_BG,
    color: colors.STATUS_EN_COURS_TEXT,
  },
  partielle: {
    backgroundColor: colors.STATUS_PARTIELLE_BG,
    color: colors.STATUS_PARTIELLE_TEXT,
  },
  receptionnee: {
    backgroundColor: colors.STATUS_RECEPTIONNEE_BG,
    color: colors.STATUS_RECEPTIONNEE_TEXT,
  },
  annulee: {
    backgroundColor: colors.BORDER,
    color: colors.MUTED,
  },
};

function formatMeta(item: Commande): string {
  const parts = [
    `${formatCommandeAmount(item.totalAmount, item.currency)} · passée par ${item.orderedBy}`,
  ];
  if (item.status === "partielle" && item.receivedBy) {
    parts.push(`reçue en partie par ${item.receivedBy}`);
  } else if (item.status === "receptionnee" && item.receivedBy) {
    parts.push(`reçue par ${item.receivedBy}`);
  }
  return parts.join(" · ");
}

type CommandeListItemProps = {
  item: Commande;
  onPress?: (item: Commande) => void;
};

export default function CommandeListItem({ item, onPress }: CommandeListItemProps) {
  const statusStyle = STATUS_STYLES[item.status];
  const title = formatCommandeTitle(item.orderedAt);
  const suppliers = item.suppliers.join(", ");
  const meta = formatMeta(item);

  return (
    <Pressable
      style={styles.card}
      onPress={() => onPress?.(item)}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${COMMANDE_STATUS_LABEL[item.status]}, ${suppliers}, ${meta}`}
      accessibilityHint="Ouvre le détail de la commande"
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <View style={[styles.badge, { backgroundColor: statusStyle.backgroundColor }]}>
          <Text style={[styles.badgeText, { color: statusStyle.color }]}>
            {COMMANDE_STATUS_LABEL[item.status]}
          </Text>
        </View>
      </View>
      <Text style={styles.suppliers} numberOfLines={1}>
        {suppliers}
      </Text>
      <Text style={styles.meta} numberOfLines={2}>
        {meta}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.WHITE,
    borderWidth: 1,
    borderColor: colors.CARD_BORDER,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    flexShrink: 1,
    color: colors.DARK,
    fontSize: 15,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  badge: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  suppliers: {
    marginTop: 6,
    color: colors.BODY,
    fontSize: 13,
    fontFamily: "Montserrat",
    fontWeight: "400",
  },
  meta: {
    marginTop: 4,
    color: colors.MUTED,
    fontSize: 12,
    fontFamily: "Montserrat",
    fontWeight: "400",
  },
});
