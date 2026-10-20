import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { isBelowThreshold, StockProduit } from "@/model/StockProduit";

type StockListItemProps = {
  item: StockProduit;
  onPress?: (item: StockProduit) => void;
};

export default function StockListItem({ item, onPress }: StockListItemProps) {
  const below = isBelowThreshold(item);
  const meta = `${item.supplier} · ${item.category}`;

  return (
    <Pressable
      style={styles.card}
      onPress={() => onPress?.(item)}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${item.designation}, ${item.quantity} en stock, seuil ${item.threshold}${
        below ? ", sous le seuil" : ""
      }`}
    >
      <View style={styles.textCol}>
        <Text style={styles.designation} numberOfLines={1}>
          {item.designation}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
        {(below || (item.orderedQty ?? 0) > 0) && (
          <View style={styles.badges}>
            {below ? (
              <View style={styles.badgeThreshold}>
                <Text style={styles.badgeThresholdText}>Sous le seuil</Text>
              </View>
            ) : null}
            {(item.orderedQty ?? 0) > 0 ? (
              <View style={styles.badgeOrdered}>
                <Text style={styles.badgeOrderedText}>{item.orderedQty} commandés</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
      <View style={styles.qtyCol}>
        <Text style={[styles.qty, below && styles.qtyBelow]}>{item.quantity}</Text>
        <Text style={styles.threshold}>seuil {item.threshold}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.WHITE,
    borderWidth: 1,
    borderColor: colors.CARD_BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  designation: {
    color: colors.DARK,
    fontSize: 14,
    fontFamily: "SemiBold",
    fontWeight: "700",
  },
  meta: {
    marginTop: 3,
    color: colors.MUTED,
    fontSize: 12,
    fontFamily: "Montserrat",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  badgeThreshold: {
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 8,
    backgroundColor: colors.STATUS_PARTIELLE_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeThresholdText: {
    color: colors.STATUS_PARTIELLE_TEXT,
    fontSize: 11,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  badgeOrdered: {
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 8,
    backgroundColor: colors.INCREASE_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeOrderedText: {
    color: colors.INCREASE_TEXT,
    fontSize: 11,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  qtyCol: {
    alignItems: "flex-end",
  },
  qty: {
    color: colors.DARK,
    fontSize: 20,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  qtyBelow: {
    color: colors.DECREASE_TEXT,
  },
  threshold: {
    marginTop: 2,
    color: colors.MUTED,
    fontSize: 11,
    fontFamily: "Montserrat",
  },
});
