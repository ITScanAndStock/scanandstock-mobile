import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../constants/colors";

const SHEET_MAX_WIDTH = 560;

type SheetFrameProps = { accessibilityLabel: string; children: ReactNode };

export default function SheetFrame({ accessibilityLabel, children }: SheetFrameProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView style={styles.scrim} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View
        style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}
        accessibilityViewIsModal={true}
        accessibilityLabel={accessibilityLabel}
      >
        <View style={styles.handle} />
        {children}
      </View>
    </KeyboardAvoidingView>
  );
}

type SheetActionsProps = {
  confirmLabel: string;
  confirmColor: string;
  confirmAccessibilityLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function SheetActions({ confirmLabel, confirmColor, confirmAccessibilityLabel, onConfirm, onCancel }: SheetActionsProps) {
  return (
    <View style={styles.actions}>
      <Pressable style={[styles.action, styles.cancel]} onPress={onCancel} accessible={true} accessibilityRole="button">
        <Text style={styles.cancelText}>Annuler</Text>
      </Pressable>
      <Pressable
        style={[styles.action, { backgroundColor: confirmColor }]}
        onPress={onConfirm}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={confirmAccessibilityLabel}
      >
        <Text style={styles.confirmText}>{confirmLabel}</Text>
      </Pressable>
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
  confirmText: {
    color: colors.WHITE,
    fontSize: 15,
    fontFamily: "SemiBold",
  },
});
