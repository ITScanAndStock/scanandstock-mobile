import type { ReactNode } from "react";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { colors } from "../constants/colors";

export const ROUND_BUTTON = {
  width: 52,
  height: 52,
  borderRadius: 26,
  alignItems: "center",
  justifyContent: "center",
} as const;

type RoundButtonProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export default function RoundButton({ label, selected, onPress, style, children }: RoundButtonProps) {
  return (
    <Pressable
      style={[styles.button, selected && styles.buttonSelected, style]}
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { selected }}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    ...ROUND_BUTTON,
    backgroundColor: colors.PILL_OVERLAY,
  },
  buttonSelected: {
    backgroundColor: colors.WHITE,
  },
});
