import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/constants/colors";
import { ReceptionLigneRowData } from "@/components/ui-components/ReceptionLigneRow";

export type ReceptionLot = {
  id: string;
  quantity: number;
  lot: string;
  expiration: string;
};

type ReceptionCorrectionSheetProps = {
  visible: boolean;
  line: ReceptionLigneRowData | null;
  supplierName?: string;
  alreadyReceived?: number;
  unitPrice?: string;
  onClose: () => void;
  onSave: (payload: {
    lineId: string;
    scannedQty: number;
    lot: string | null;
    expiration: string | null;
    unitPrice: string;
  }) => void;
};

export default function ReceptionCorrectionSheet({
  visible,
  line,
  supplierName = "Fournisseur A",
  alreadyReceived = 0,
  unitPrice = "18,40 €",
  onClose,
  onSave,
}: ReceptionCorrectionSheetProps) {
  const insets = useSafeAreaInsets();
  const [lots, setLots] = useState<ReceptionLot[]>([]);
  const [price, setPrice] = useState(unitPrice);

  useEffect(() => {
    if (!visible || !line) {
      return;
    }
    setPrice(unitPrice);
    setLots([
      {
        id: "lot-1",
        quantity: Math.max(line.scannedQty, 0),
        lot: line.lot ?? "",
        expiration: line.expiration ?? "",
      },
    ]);
  }, [visible, line, unitPrice]);

  if (!line) {
    return null;
  }

  const updateLot = (lotId: string, patch: Partial<ReceptionLot>) => {
    setLots((prev) => prev.map((lot) => (lot.id === lotId ? { ...lot, ...patch } : lot)));
  };

  const removeLot = (lotId: string) => {
    setLots((prev) => (prev.length <= 1 ? prev : prev.filter((lot) => lot.id !== lotId)));
  };

  const addLot = () => {
    setLots((prev) => [
      ...prev,
      {
        id: `lot-${Date.now()}`,
        quantity: 0,
        lot: "",
        expiration: "",
      },
    ]);
  };

  const handleSave = () => {
    const primary = lots[0];
    const totalQty = lots.reduce((sum, lot) => sum + lot.quantity, 0);
    onSave({
      lineId: line.id,
      scannedQty: totalQty,
      lot: primary?.lot || null,
      expiration: primary?.expiration || null,
      unitPrice: price,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>{line.designation}</Text>
            <Text style={styles.subtitle}>
              Commandé {line.orderedQty} · déjà reçu {alreadyReceived} · {supplierName}
            </Text>

            {lots.map((lot, index) => (
              <View key={lot.id} style={styles.lotCard}>
                <View style={styles.lotHeader}>
                  <Text style={styles.lotTitle}>Lot {index + 1}</Text>
                  <Pressable
                    onPress={() => removeLot(lot.id)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Retirer ce lot"
                  >
                    <Text style={styles.removeLabel}>Retirer</Text>
                  </Pressable>
                </View>

                <Text style={styles.fieldLabel}>Quantité reçue</Text>
                <View style={styles.stepperRow}>
                  <Pressable
                    style={styles.stepperBtn}
                    onPress={() =>
                      updateLot(lot.id, { quantity: Math.max(0, lot.quantity - 1) })
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Retirer un"
                  >
                    <Text style={styles.stepperBtnText}>−</Text>
                  </Pressable>
                  <View style={styles.qtyBox}>
                    <Text style={styles.qtyValue}>{lot.quantity}</Text>
                  </View>
                  <Pressable
                    style={styles.stepperBtn}
                    onPress={() => updateLot(lot.id, { quantity: lot.quantity + 1 })}
                    accessibilityRole="button"
                    accessibilityLabel="Ajouter un"
                  >
                    <Text style={styles.stepperBtnText}>+</Text>
                  </Pressable>
                </View>

                <View style={styles.twoCols}>
                  <View style={styles.col}>
                    <Text style={styles.fieldLabel}>N° de lot</Text>
                    <TextInput
                      style={styles.input}
                      value={lot.lot}
                      onChangeText={(text) => updateLot(lot.id, { lot: text })}
                      autoCapitalize="characters"
                      placeholder="N° de lot"
                      placeholderTextColor={colors.MUTED}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.fieldLabel}>Péremption</Text>
                    <TextInput
                      style={styles.input}
                      value={lot.expiration}
                      onChangeText={(text) => updateLot(lot.id, { expiration: text })}
                      placeholder="MM/AAAA"
                      placeholderTextColor={colors.MUTED}
                    />
                  </View>
                </View>
              </View>
            ))}

            <Pressable
              style={styles.addLotBtn}
              onPress={addLot}
              accessibilityRole="button"
              accessibilityLabel="Ajouter un autre lot"
            >
              <Text style={styles.addLotLabel}>+ Ajouter un autre lot</Text>
            </Pressable>

            <Text style={styles.fieldLabel}>Prix unitaire</Text>
            <TextInput
              style={[styles.input, styles.priceInput]}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose} accessibilityRole="button">
              <Text style={styles.cancelLabel}>Annuler</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={handleSave} accessibilityRole="button">
              <Text style={styles.saveLabel}>Enregistrer</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,14,16,0.55)",
  },
  sheet: {
    backgroundColor: colors.WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 20,
    maxHeight: "85%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#CBD3D7",
    marginBottom: 16,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 16,
  },
  title: {
    color: colors.DARK,
    fontSize: 17,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 4,
    color: colors.MUTED,
    fontSize: 13,
    fontFamily: "Montserrat",
  },
  lotCard: {
    borderWidth: 1,
    borderColor: colors.CARD_BORDER,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  lotHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lotTitle: {
    color: colors.DARK,
    fontSize: 14,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  removeLabel: {
    color: colors.DECREASE_TEXT,
    fontSize: 13,
    fontFamily: "SemiBold",
    fontWeight: "700",
  },
  fieldLabel: {
    color: colors.MUTED,
    fontSize: 12,
    fontFamily: "SemiBold",
    fontWeight: "700",
    marginBottom: 6,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD3D7",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.WHITE,
  },
  stepperBtnText: {
    color: colors.DARK,
    fontSize: 22,
    fontFamily: "SemiBold",
    fontWeight: "700",
  },
  qtyBox: {
    width: 80,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD3D7",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.WHITE,
  },
  qtyValue: {
    color: colors.DARK,
    fontSize: 18,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  twoCols: {
    flexDirection: "row",
    gap: 10,
  },
  col: {
    flex: 1,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD3D7",
    paddingHorizontal: 14,
    color: colors.DARK,
    fontSize: 15,
    fontFamily: "SemiBold",
    fontWeight: "600",
    backgroundColor: colors.WHITE,
  },
  priceInput: {
    width: "100%",
  },
  addLotBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#9AA6AD",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.WHITE,
  },
  addLotLabel: {
    color: colors.DARK,
    fontSize: 14,
    fontFamily: "SemiBold",
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD3D7",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.WHITE,
  },
  cancelLabel: {
    color: colors.DARK,
    fontSize: 15,
    fontFamily: "SemiBold",
    fontWeight: "700",
  },
  saveBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.GREEN_DARK,
  },
  saveLabel: {
    color: colors.WHITE,
    fontSize: 15,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
});
