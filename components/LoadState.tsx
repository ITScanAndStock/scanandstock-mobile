import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../constants/colors";

export function Loading({ label }: { label: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.GREEN_DARK} accessibilityLabel={label} />
    </View>
  );
}

export function LoadFailed({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.message}>{message}</Text>
      <Pressable style={styles.retry} onPress={onRetry} accessibilityRole="button">
        <Text style={styles.retryText}>Réessayer</Text>
      </Pressable>
    </View>
  );
}

export const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 16,
  },
  message: {
    color: colors.MUTED,
    fontSize: 15,
    fontFamily: "Montserrat",
    textAlign: "center",
  },
  retry: {
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 20,
    backgroundColor: colors.GREEN_DARK,
    justifyContent: "center",
  },
  retryText: {
    color: colors.WHITE,
    fontSize: 14,
    fontFamily: "SemiBold",
  },
});
