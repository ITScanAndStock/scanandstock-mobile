import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { colors } from "../constants/colors";
import type { DraftLine } from "../services/ReceiptDraft";
import { type LineForm, type LineFormRow, type LineFormSave, lineForm, maskExpiration, priceOffered } from "../services/ReceiptLineEdit";
import SheetFrame, { SheetActions } from "./SheetFrame";

type ReceiptLineSheetProps = {
  line: DraftLine;
  onSave: (form: LineForm) => LineFormSave;
  onCancel: () => void;
};

const EMPTY_ROW: LineFormRow = { quantity: "1", batchNumber: "", expiration: "" };

function stepQuantity(quantity: string, by: number) {
  const value = /^\d+$/.test(quantity) ? Number(quantity) : 0;
  return String(Math.max(0, value + by));
}

export default function ReceiptLineSheet({ line, onSave, onCancel }: ReceiptLineSheetProps) {
  const [form, setForm] = useState(() => lineForm(line));
  const [error, setError] = useState<string | null>(null);
  const { item } = line;
  const details = [`Commandé ${item.itemQuantity}`, `déjà reçu ${line.deliveredAtStart}`, item.itemProviderName]
    .filter(Boolean)
    .join(" · ");

  const editRow = (index: number, changes: Partial<LineFormRow>) =>
    setForm((current) => ({
      ...current,
      rows: current.rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...changes } : row)),
    }));

  const save = () => {
    const saved = onSave(form);
    if (saved.kind === "invalid") {
      setError(saved.message);
    }
  };

  return (
    <SheetFrame accessibilityLabel="Corriger la ligne">
      <View>
        <Text style={styles.designation} numberOfLines={2} accessibilityRole="header">
          {item.itemDesignation}
        </Text>
        <Text style={styles.details}>{details}</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
        {form.rows.map((row, index) => (
          <View key={index} style={styles.batch}>
            <View style={styles.batchHeader}>
              <Text style={styles.batchTitle}>Lot {index + 1}</Text>
              <Pressable
                style={styles.removeBatch}
                onPress={() => setForm((current) => ({ ...current, rows: current.rows.filter((_, i) => i !== index) }))}
                accessibilityRole="button"
                accessibilityLabel={`Retirer le lot ${index + 1}`}
              >
                <Text style={styles.removeBatchText}>Retirer</Text>
              </Pressable>
            </View>
            <View>
              <Text style={styles.label}>Quantité reçue</Text>
              <View style={styles.stepper}>
                <Pressable
                  style={styles.step}
                  onPress={() => editRow(index, { quantity: stepQuantity(row.quantity, -1) })}
                  accessibilityRole="button"
                  accessibilityLabel="Retirer un"
                >
                  <Text style={styles.stepText}>−</Text>
                </Pressable>
                <TextInput
                  style={[styles.input, styles.quantityInput]}
                  value={row.quantity}
                  onChangeText={(quantity) => editRow(index, { quantity })}
                  keyboardType="number-pad"
                  accessibilityLabel="Quantité reçue"
                />
                <Pressable
                  style={styles.step}
                  onPress={() => editRow(index, { quantity: stepQuantity(row.quantity, 1) })}
                  accessibilityRole="button"
                  accessibilityLabel="Ajouter un"
                >
                  <Text style={styles.stepText}>+</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.fields}>
              <View style={styles.field}>
                <Text style={styles.label}>N° de lot</Text>
                <TextInput
                  style={styles.input}
                  value={row.batchNumber}
                  onChangeText={(batchNumber) => editRow(index, { batchNumber })}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  accessibilityLabel="Numéro de lot"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Péremption</Text>
                <TextInput
                  style={styles.input}
                  value={row.expiration}
                  onChangeText={(text) => editRow(index, { expiration: maskExpiration(text) })}
                  keyboardType="number-pad"
                  placeholder="jj/mm/aaaa"
                  placeholderTextColor={colors.RADIO_BORDER}
                  accessibilityLabel="Date de péremption, jour, mois et année"
                />
              </View>
            </View>
          </View>
        ))}
        <Pressable
          style={styles.addBatch}
          onPress={() => setForm((current) => ({ ...current, rows: [...current.rows, EMPTY_ROW] }))}
          accessibilityRole="button"
        >
          <Text style={styles.addBatchText}>+ Ajouter {form.rows.length > 0 ? "un autre lot" : "un lot"}</Text>
        </Pressable>
        {priceOffered(form) ? (
          <View>
            <Text style={styles.label}>Prix unitaire (€)</Text>
            <TextInput
              style={styles.input}
              value={form.price}
              onChangeText={(price) => setForm((current) => ({ ...current, price }))}
              keyboardType="decimal-pad"
              accessibilityLabel="Prix unitaire en euros"
            />
          </View>
        ) : null}
      </ScrollView>

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <SheetActions confirmLabel="Enregistrer" confirmColor={colors.GREEN_DARK} onConfirm={save} onCancel={onCancel} />
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  designation: {
    color: colors.DARK,
    fontSize: 17,
    fontFamily: "SemiBold",
  },
  details: {
    marginTop: 4,
    color: colors.MUTED,
    fontSize: 13,
    fontFamily: "Montserrat",
  },
  body: {
    flexShrink: 1,
  },
  bodyContent: {
    gap: 16,
  },
  batch: {
    borderWidth: 1,
    borderColor: colors.OPTION_BORDER,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  batchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  batchTitle: {
    color: colors.DARK,
    fontSize: 14,
    fontFamily: "SemiBold",
  },
  removeBatch: {
    height: 44,
    justifyContent: "center",
  },
  removeBatchText: {
    color: colors.WITHDRAW,
    fontSize: 13,
    fontFamily: "SemiBold",
  },
  label: {
    marginBottom: 6,
    color: colors.MUTED,
    fontSize: 12,
    fontFamily: "SemiBold",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  step: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: colors.NEUTRAL_LINE,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    color: colors.DARK,
    fontSize: 22,
    fontFamily: "SemiBold",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.NEUTRAL_LINE,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: colors.DARK,
    fontSize: 15,
    fontFamily: "SemiBold",
    backgroundColor: colors.WHITE,
  },
  quantityInput: {
    width: 80,
    textAlign: "center",
    fontSize: 18,
  },
  fields: {
    flexDirection: "row",
    gap: 10,
  },
  field: {
    flex: 1,
    minWidth: 0,
  },
  addBatch: {
    height: 48,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.RADIO_BORDER,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addBatchText: {
    color: colors.DARK,
    fontSize: 14,
    fontFamily: "SemiBold",
  },
  error: {
    color: colors.DECREASE_TEXT,
    fontSize: 13,
    fontFamily: "SemiBold",
  },
});
