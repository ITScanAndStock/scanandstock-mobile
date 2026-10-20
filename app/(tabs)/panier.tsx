import { StyleSheet, View } from "react-native";

import ThemedText from "@/components/ui-components/ThemedText";

export default function Panier() {
  return (
    <View style={styles.container}>
      <ThemedText variant="productDesignation">Panier</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
});
