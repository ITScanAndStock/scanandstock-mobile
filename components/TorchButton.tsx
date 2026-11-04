import type { StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "../constants/colors";
import RoundButton from "./RoundButton";

type TorchButtonProps = { on: boolean; onPress: () => void; style?: StyleProp<ViewStyle> };

export default function TorchButton({ on, onPress, style }: TorchButtonProps) {
  return (
    <RoundButton label={on ? "Éteindre la torche" : "Allumer la torche"} selected={on} onPress={onPress} style={style}>
      <Ionicons
        name={on ? "flashlight" : "flashlight-outline"}
        size={24}
        color={on ? colors.DARK : colors.WHITE}
        accessible={false}
      />
    </RoundButton>
  );
}
