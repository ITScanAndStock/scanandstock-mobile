import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CloseIcon from "../assets/images/figma/close.svg";
import { colors } from "../constants/colors";
import { Batch } from "../model/Batch";

const SHEET_MAX_WIDTH = 560;

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
  return expirationDate ? `Périme le ${expirationDate.split("-").join("/")}` : "Sans date de péremption";
}

export default function BatchSheet({ designation, batches, onWithdraw, onCancel }: BatchSheetProps) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState(batches[0]);

  return (
    <View style={styles.scrim}>
      <View
        style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}
        accessibilityViewIsModal={true}
        accessibilityLabel="Choisir le lot à retirer"
      >
        <View style={styles.handle} />
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

        <View style={styles.actions}>
          <Pressable
            style={[styles.action, styles.cancel]}
            onPress={onCancel}
            accessible={true}
            accessibilityRole="button"
          >
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
          <Pressable
            style={[styles.action, styles.withdraw]}
            onPress={() => onWithdraw(selected)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Retirer 1 du ${batchLabel(selected).toLowerCase()}`}
          >
            <Text style={styles.withdrawText}>Retirer 1</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.SCRIM,
    justifyContent: "flex-end",
    zIndex: 40,
  },
  sheet: {
    alignSelf: "center",
    width: "100%",
    maxWidth: SHEET_MAX_WIDTH,
    maxHeight: "85%",
    backgroundColor: colors.WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 20,
    gap: 14,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.NEUTRAL_LINE,
  },
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
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  action: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancel: {
    borderWidth: 1,
    borderColor: colors.NEUTRAL_LINE,
    backgroundColor: colors.WHITE,
  },
  cancelText: {
    color: colors.DARK,
    fontSize: 15,
    fontFamily: "SemiBold",
  },
  withdraw: {
    backgroundColor: colors.WITHDRAW,
  },
  withdrawText: {
    color: colors.WHITE,
    fontSize: 15,
    fontFamily: "SemiBold",
  },
});
