import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { colors } from "../constants/colors";
import { useCanReceive } from "../hooks/useCanReceive";
import type { Order } from "../model/Order";
import { isReceivable } from "../services/OrderProgress";

export default function ReceptionNote({ order, style }: { order: Order; style?: StyleProp<ViewStyle> }) {
  const canReceive = useCanReceive(order.orderId);

  if (!isReceivable(order) || canReceive !== false) {
    return null;
  }
  return (
    <View style={style}>
      <Text style={styles.note}>La réception est réservée aux personnes habilitées de votre cabinet</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    color: colors.TEXT_SECONDARY,
    fontSize: 14,
    fontFamily: "Medium",
    textAlign: "center",
  },
});
