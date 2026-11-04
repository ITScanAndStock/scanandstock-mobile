import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../constants/colors";
import { expirationMonth } from "../services/ReceiptBanner";
import { type DraftLine, draftQuantity } from "../services/ReceiptDraft";

const COUNT_TONES = {
  over: { background: colors.STATUS_PARTIAL_BG, text: colors.WITHDRAW },
  scanned: { background: colors.INCREASE_BG, text: colors.INCREASE_TEXT },
  idle: { background: colors.BORDER, text: colors.MUTED },
};

const isFinishedAtStart = (line: DraftLine) => line.deliveredAtStart >= line.item.itemQuantity;

export function finishedAtStartCount(lines: readonly DraftLine[]) {
  return lines.filter(isFinishedAtStart).length;
}

function batchesSummary(line: DraftLine) {
  if (line.batches.length === 0) {
    return isFinishedAtStart(line) ? "Déjà terminée" : "Pas encore scannée";
  }
  return line.batches
    .map((batch) =>
      [batch.batchNumber ? `Lot ${batch.batchNumber}` : "Sans lot", batch.expirationDate && expirationMonth(batch.expirationDate)]
        .filter(Boolean)
        .join(" · "),
    )
    .join(", ");
}

type ReceiptLineRowProps = { line: DraftLine; onPress: () => void; disabled: boolean };

export default function ReceiptLineRow({ line, onPress, disabled }: ReceiptLineRowProps) {
  const scanned = draftQuantity(line);
  const received = line.deliveredAtStart + scanned;
  const tone = received > line.item.itemQuantity ? "over" : scanned > 0 ? "scanned" : "idle";
  const summary = batchesSummary(line);

  return (
    <Pressable
      style={[styles.line, scanned > 0 && styles.lineScanned]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityHint="Corriger la ligne"
      accessibilityLabel={`${line.item.itemDesignation}, reçu ${received} sur ${line.item.itemQuantity}${tone === "over" ? ", au-delà du commandé" : ""}, ${summary}`}
    >
      <View style={styles.text}>
        <Text style={receiptTextStyles.designation} numberOfLines={1}>
          {line.item.itemDesignation}
        </Text>
        <Text style={receiptTextStyles.meta} numberOfLines={1}>
          {summary}
        </Text>
      </View>
      <View style={[styles.count, { backgroundColor: COUNT_TONES[tone].background }]}>
        <Text style={[styles.countText, { color: COUNT_TONES[tone].text }]}>
          {received} / {line.item.itemQuantity}
        </Text>
      </View>
    </Pressable>
  );
}

export const receiptTextStyles = StyleSheet.create({
  designation: {
    color: colors.DARK,
    fontSize: 14,
    fontFamily: "SemiBold",
  },
  meta: {
    marginTop: 2,
    color: colors.MUTED,
    fontSize: 12,
    fontFamily: "Montserrat",
  },
});

const styles = StyleSheet.create({
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.BORDER,
  },
  lineScanned: {
    backgroundColor: colors.OPTION_SELECTED_BG,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  count: {
    minWidth: 54,
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: 14,
    fontFamily: "SemiBold",
  },
});
