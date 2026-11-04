import { StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { colors } from "../constants/colors";
import RoundButton from "./RoundButton";

type ZoomResetButtonProps = { onPress: () => void; style?: StyleProp<ViewStyle> };

export default function ZoomResetButton({ onPress, style }: ZoomResetButtonProps) {
  return (
    <RoundButton label="Revenir sans zoom" onPress={onPress} style={style}>
      <Text style={styles.text} accessible={false}>
        1×
      </Text>
    </RoundButton>
  );
}

const styles = StyleSheet.create({
  text: {
    color: colors.WHITE,
    fontFamily: "SemiBold",
    fontSize: 16,
  },
});
