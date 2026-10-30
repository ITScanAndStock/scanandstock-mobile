import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";

import { colors } from "../constants/colors";
import { useCanReceive } from "../hooks/useCanReceive";
import type { Order } from "../model/Order";
import { isReceivable } from "../services/OrderProgress";

export default function ReceptionAction({ order, style }: { order: Order; style?: StyleProp<ViewStyle> }) {
  const canReceive = useCanReceive(order.orderId);
  const router = useRouter();

  if (!isReceivable(order) || canReceive === null) {
    return null;
  }
  if (!canReceive) {
    return (
      <View style={style}>
        <Text style={styles.note}>La réception est réservée aux personnes habilitées de votre cabinet</Text>
      </View>
    );
  }
  return (
    <View style={style}>
      <Pressable
        style={styles.button}
        onPress={() =>
          router.push({ pathname: "/orders/receive/[orderId]", params: { orderId: String(order.orderId) } })
        }
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Réceptionner en scannant</Text>
      </Pressable>
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
  button: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.GREEN_DARK,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: colors.WHITE,
    fontSize: 16,
    fontFamily: "SemiBold",
  },
});
