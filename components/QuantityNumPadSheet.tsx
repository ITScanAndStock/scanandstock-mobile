import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/constants/colors";

type QuantityNumPadSheetProps = {
  visible: boolean;
  title?: string;
  onClose: () => void;
  onAdd: (qty: number) => void;
  onRemove: (qty: number) => void;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"] as const;

export default function QuantityNumPadSheet({
  visible,
  title = "Saisir une quantité",
  onClose,
  onAdd,
  onRemove,
}: QuantityNumPadSheetProps) {
  const insets = useSafeAreaInsets();
  const [digits, setDigits] = useState("");

  useEffect(() => {
    if (visible) {
      setDigits("");
    }
  }, [visible]);

  const value = Number.parseInt(digits || "0", 10);
  const canConfirm = value > 0;

  const pressKey = (key: string) => {
    if (key === "") {
      return;
    }
    if (key === "⌫") {
      setDigits((prev) => prev.slice(0, -1));
      return;
    }
    setDigits((prev) => {
      if (prev.length >= 4) {
        return prev;
      }
      if (prev === "0") {
        return key;
      }
      return `${prev}${key}`;
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.display} accessible={true} accessibilityLabel={`Quantité ${value}`}>
            {digits || "0"}
          </Text>

          <View style={styles.pad}>
            {KEYS.map((key, index) => (
              <Pressable
                key={`${key}-${index}`}
                style={[styles.key, key === "" && styles.keyEmpty]}
                onPress={() => pressKey(key)}
                disabled={key === ""}
                accessible={key !== ""}
                accessibilityRole="button"
                accessibilityLabel={key === "⌫" ? "Effacer" : key}
              >
                {key !== "" ? <Text style={styles.keyLabel}>{key}</Text> : null}
              </Pressable>
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.actionBtn, styles.removeBtn, !canConfirm && styles.actionDisabled]}
              disabled={!canConfirm}
              onPress={() => {
                onRemove(value);
                onClose();
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Retirer ${value}`}
            >
              <Text style={styles.removeLabel}>Retirer</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.addBtn, !canConfirm && styles.actionDisabled]}
              disabled={!canConfirm}
              onPress={() => {
                onAdd(value);
                onClose();
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Ajouter ${value}`}
            >
              <Text style={styles.addLabel}>Ajouter</Text>
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
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#CBD3D7",
    marginBottom: 16,
  },
  title: {
    color: colors.DARK,
    fontSize: 16,
    fontFamily: "SemiBold",
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  display: {
    color: colors.DARK,
    fontSize: 40,
    lineHeight: 48,
    fontFamily: "SemiBold",
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
  },
  pad: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 16,
  },
  key: {
    width: "30%",
    height: 56,
    borderRadius: 14,
    backgroundColor: "#EEF1F2",
    alignItems: "center",
    justifyContent: "center",
  },
  keyEmpty: {
    backgroundColor: "transparent",
  },
  keyLabel: {
    color: colors.DARK,
    fontSize: 22,
    fontFamily: "SemiBold",
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionDisabled: {
    opacity: 0.4,
  },
  removeBtn: {
    borderWidth: 1,
    borderColor: "#CBD3D7",
    backgroundColor: colors.WHITE,
  },
  removeLabel: {
    color: colors.DARK,
    fontSize: 15,
    fontFamily: "SemiBold",
    fontWeight: "700",
  },
  addBtn: {
    backgroundColor: colors.GREEN_DARK,
  },
  addLabel: {
    color: colors.WHITE,
    fontSize: 15,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
});
