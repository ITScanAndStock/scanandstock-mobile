import { StyleSheet, Text, View } from "react-native";

import { colors } from "../constants/colors";
import { expirationMonth } from "../services/ReceiptBanner";
import { type DraftLine, draftQuantity } from "../services/ReceiptDraft";

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

export default function ReceiptLineRow({ line }: { line: DraftLine }) {
  const scanned = draftQuantity(line);
  const received = line.deliveredAtStart + scanned;
  const summary = batchesSummary(line);

  return (
    <View
      style={[styles.line, scanned > 0 && styles.lineScanned]}
      accessible={true}
      accessibilityLabel={`${line.item.itemDesignation}, reçu ${received} sur ${line.item.itemQuantity}, ${summary}`}
    >
      <View style={styles.text}>
        <Text style={receiptTextStyles.designation} numberOfLines={1}>
          {line.item.itemDesignation}
        </Text>
        <Text style={receiptTextStyles.meta} numberOfLines={1}>
          {summary}
        </Text>
      </View>
      <View style={[styles.count, scanned > 0 ? styles.countScanned : styles.countIdle]}>
        <Text style={[styles.countText, { color: scanned > 0 ? colors.INCREASE_TEXT : colors.MUTED }]}>
          {received} / {line.item.itemQuantity}
        </Text>
      </View>
    </View>
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
  countScanned: {
    backgroundColor: colors.INCREASE_BG,
  },
  countIdle: {
    backgroundColor: colors.BORDER,
  },
  countText: {
    fontSize: 14,
    fontFamily: "SemiBold",
  },
});
