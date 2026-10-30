import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import CloseIcon from "../assets/images/figma/close.svg";
import { colors } from "../constants/colors";
import { Batch } from "../model/Batch";
import { fullExpiration } from "../services/ReceiptBanner";
import SheetFrame, { SheetActions } from "./SheetFrame";

type BatchSheetProps = {
  designation: string;
  batches: Batch[];
  onWithdraw: (batch: Batch) => void;
  onCancel: () => void;
};

function batchLabel({ batchNumber }: Batch) {
  return batchNumber ? `Lot ${batchNumber}` : "Sans numéro de lot";
}

function expirationLabel({ expirationDate }: Batch) {
  return expirationDate ? `Périme le ${fullExpiration(expirationDate)}` : "Sans date de péremption";
}

export default function BatchSheet({ designation, batches, onWithdraw, onCancel }: BatchSheetProps) {
  const [selected, setSelected] = useState(batches[0]);

  return (
    <SheetFrame accessibilityLabel="Choisir le lot à retirer">
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.designation} numberOfLines={2}>
            {designation}
          </Text>
          <Text style={styles.title} accessibilityRole="header">
            De quel lot retirer ?
          </Text>
        </View>
        <Pressable
          style={styles.closeBtn}
          onPress={onCancel}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Fermer le choix du lot"
        >
          <CloseIcon width={18} height={18} accessible={false} />
        </Pressable>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} accessibilityRole="radiogroup">
        {batches.map((batch) => {
          const checked = batch.stockDetailsId === selected.stockDetailsId;
          return (
            <Pressable
              key={batch.stockDetailsId}
              style={[styles.option, checked && styles.optionChecked]}
              onPress={() => setSelected(batch)}
              accessible={true}
              accessibilityRole="radio"
              accessibilityState={{ checked }}
              accessibilityLabel={`${batchLabel(batch)}, ${expirationLabel(batch)}, ${batch.quantity} en stock`}
            >
              <View style={[styles.radio, checked && styles.radioChecked]} />
              <View style={styles.optionText}>
                <Text style={styles.batchNumber}>{batchLabel(batch)}</Text>
                <Text style={styles.expiration}>{expirationLabel(batch)}</Text>
              </View>
              <Text style={styles.quantity}>{batch.quantity} en stock</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <SheetActions
        confirmLabel="Retirer 1"
        confirmColor={colors.WITHDRAW}
        confirmAccessibilityLabel={`Retirer 1 du ${batchLabel(selected).toLowerCase()}`}
        onConfirm={() => onWithdraw(selected)}
        onCancel={onCancel}
      />
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  designation: {
    color: colors.MUTED,
    fontSize: 13,
    fontFamily: "SemiBold",
  },
  title: {
    color: colors.DARK,
    fontSize: 18,
    fontFamily: "SemiBold",
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    flexShrink: 1,
  },
  listContent: {
    gap: 10,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: colors.OPTION_BORDER,
    borderRadius: 14,
    backgroundColor: colors.WHITE,
  },
  optionChecked: {
    borderColor: colors.GREEN_DARK,
    backgroundColor: colors.OPTION_SELECTED_BG,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.RADIO_BORDER,
  },
  radioChecked: {
    borderWidth: 7,
    borderColor: colors.GREEN_DARK,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  batchNumber: {
    color: colors.DARK,
    fontSize: 15,
    fontFamily: "SemiBold",
  },
  expiration: {
    color: colors.MUTED,
    fontSize: 12,
    fontFamily: "Medium",
  },
  quantity: {
    color: colors.MUTED,
    fontSize: 13,
    fontFamily: "SemiBold",
  },
});
