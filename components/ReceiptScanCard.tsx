import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { colors } from "../constants/colors";
import type { ReceiptBanner } from "../services/ReceiptBanner";
import { receiptTextStyles } from "./ReceiptLineRow";

const TONES = {
  success: { mark: "✓", background: colors.INCREASE_BG, color: colors.INCREASE_TEXT },
  error: { mark: "!", background: colors.DECREASE_BG, color: colors.DECREASE_TEXT },
};

export default function ReceiptScanCard({ banner, style }: { banner: ReceiptBanner; style?: StyleProp<ViewStyle> }) {
  const tone = TONES[banner.tone];
  return (
    <View style={[styles.card, style]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <View style={[styles.icon, { backgroundColor: tone.background }]}>
        <Text style={[styles.mark, { color: tone.color }]}>{tone.mark}</Text>
      </View>
      <View style={styles.text}>
        <Text style={receiptTextStyles.designation} numberOfLines={1}>
          {banner.title}
        </Text>
        {banner.detail ? (
          <Text style={receiptTextStyles.meta} numberOfLines={1}>
            {banner.detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.WHITE,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  mark: {
    fontSize: 16,
    fontFamily: "SemiBold",
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
});
