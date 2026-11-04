import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "../constants/colors";

export const ROUND_BUTTON = {
  width: 52,
  height: 52,
  borderRadius: 26,
  alignItems: "center",
  justifyContent: "center",
} as const;

type TorchButtonProps = { on: boolean; onPress: () => void; style?: StyleProp<ViewStyle> };

export default function TorchButton({ on, onPress, style }: TorchButtonProps) {
  return (
    <Pressable
      style={[styles.button, on && styles.buttonOn, style]}
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={on ? "Éteindre la torche" : "Allumer la torche"}
      accessibilityState={{ selected: on }}
    >
      <Ionicons
        name={on ? "flashlight" : "flashlight-outline"}
        size={24}
        color={on ? colors.DARK : colors.WHITE}
        accessible={false}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    ...ROUND_BUTTON,
    backgroundColor: colors.PILL_OVERLAY,
  },
  buttonOn: {
    backgroundColor: colors.WHITE,
  },
});
