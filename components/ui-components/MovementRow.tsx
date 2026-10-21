import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { StatsModel } from "@/model/Stats";

function formatMovementTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (date >= startOfToday) {
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  if (date >= startOfYesterday) {
    return "hier";
  }
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function isIncrease(type: string, quantity: number): boolean {
  if (type === "increase" || type === "in" || type === "entrée") {
    return true;
  }
  if (type === "decrease" || type === "out" || type === "sortie") {
    return false;
  }
  return quantity >= 0;
}

interface MovementRowProps {
  item: StatsModel;
}

export default function MovementRow({ item }: MovementRowProps) {
  const increase = isIncrease(item.type, item.quantity);
  const absoluteQty = Math.abs(item.quantity);
  const label = increase ? `+${absoluteQty}` : `−${absoluteQty}`;

  return (
    <View
      style={styles.row}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`${item.designation}, ${formatMovementTime(item.mvmtDateTime)}, ${label}`}
    >
      <Text style={styles.designation} numberOfLines={1} ellipsizeMode="tail">
        {item.designation}
      </Text>
      <Text style={styles.time}>{formatMovementTime(item.mvmtDateTime)}</Text>
      <View style={[styles.badge, increase ? styles.increaseBadge : styles.decreaseBadge]}>
        <Text style={[styles.badgeText, increase ? styles.increaseText : styles.decreaseText]}>{label}</Text>
      </View>
    </View>
  );
}

export const MOVEMENT_ROW_HEIGHT = 53;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: MOVEMENT_ROW_HEIGHT,
    borderTopWidth: 1,
    borderTopColor: colors.BORDER,
  },
  designation: {
    flex: 1,
    color: colors.DARK,
    fontSize: 14,
    fontFamily: "SemiBold",
  },
  time: {
    color: colors.MUTED,
    fontSize: 12,
    fontFamily: "Montserrat",
  },
  badge: {
    minWidth: 48,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  increaseBadge: {
    backgroundColor: colors.INCREASE_BG,
  },
  decreaseBadge: {
    backgroundColor: colors.DECREASE_BG,
  },
  badgeText: {
    fontSize: 14,
    fontFamily: "SemiBold",
  },
  increaseText: {
    color: colors.INCREASE_TEXT,
  },
  decreaseText: {
    color: colors.DECREASE_TEXT,
  },
});
