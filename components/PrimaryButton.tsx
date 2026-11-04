import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "../constants/colors";

type PrimaryButtonProps = { label: string; onPress: () => void; disabled?: boolean; busy?: boolean };

export default function PrimaryButton({ label, onPress, disabled = false, busy = false }: PrimaryButtonProps) {
  return (
    <Pressable
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy }}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.GREEN_DARK,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: colors.WHITE,
    fontSize: 16,
    fontFamily: "SemiBold",
  },
});
