import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { StatsModel } from "@/model/Stats";
import { formatMovementDate } from "@/services/MovementDate";
import { movementDirection } from "@/services/MovementDirection";

interface MovementRowProps {
  item: StatsModel;
}

export default function MovementRow({ item }: MovementRowProps) {
  const { increase, label } = movementDirection(item);
  const date = formatMovementDate(item.mvmtDateTime, new Date());

  return (
    <View
      style={styles.row}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`${item.designation}, ${date}, ${label}`}
    >
      <Text style={styles.designation} numberOfLines={1} ellipsizeMode="tail">
        {item.designation}
      </Text>
      <Text style={styles.time}>{date}</Text>
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
