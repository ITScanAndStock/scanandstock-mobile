import { Pressable, StyleSheet, Text, View } from "react-native";

import ChevronRight from "@/assets/images/figma/chevron-right.svg";
import { colors } from "@/constants/colors";

export type ReceptionLigneRowData = {
  id: string;
  designation: string;
  orderedQty: number;
  scannedQty: number;
  lot?: string | null;
  expiration?: string | null;
};

type ReceptionLigneRowProps = {
  item: ReceptionLigneRowData;
  highlighted?: boolean;
  onPress?: (item: ReceptionLigneRowData) => void;
};

export default function ReceptionLigneRow({ item, highlighted, onPress }: ReceptionLigneRowProps) {
  const complete = item.scannedQty >= item.orderedQty && item.orderedQty > 0;
  const started = item.scannedQty > 0;
  const subtitle =
    started && item.lot
      ? `Lot ${item.lot}${item.expiration ? ` · ${item.expiration}` : ""}`
      : "Pas encore scannée";

  return (
    <Pressable
      style={[styles.row, highlighted && styles.rowHighlighted]}
      onPress={() => onPress?.(item)}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${item.designation}, ${item.scannedQty} sur ${item.orderedQty}, ${subtitle}`}
    >
      <View style={styles.textCol}>
        <Text style={styles.designation} numberOfLines={1}>
          {item.designation}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={[styles.qtyBadge, started || complete ? styles.qtyBadgeActive : styles.qtyBadgeIdle]}>
        <Text style={[styles.qtyText, started || complete ? styles.qtyTextActive : styles.qtyTextIdle]}>
          {item.scannedQty}/{item.orderedQty}
        </Text>
      </View>
      <ChevronRight width={16} height={16} accessible={false} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.BORDER,
  },
  rowHighlighted: {
    backgroundColor: "#F3FAF9",
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
  subtitle: {
    marginTop: 2,
    color: colors.MUTED,
    fontSize: 12,
    fontFamily: "Montserrat",
    fontWeight: "400",
  },
  qtyBadge: {
    minWidth: 54,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  qtyBadgeActive: {
    backgroundColor: colors.INCREASE_BG,
  },
  qtyBadgeIdle: {
    backgroundColor: "#EEF1F2",
  },
  qtyText: {
    fontSize: 14,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  qtyTextActive: {
    color: colors.INCREASE_TEXT,
  },
  qtyTextIdle: {
    color: colors.MUTED,
  },
});
