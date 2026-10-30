import type { ReactNode } from "react";
import { Button, StyleSheet, Text, View } from "react-native";

import { colors } from "../constants/colors";

export default function CameraPermissionRequest({ onRequest, children }: { onRequest: () => void; children?: ReactNode }) {
  return (
    <View style={styles.container} accessible={true} accessibilityLabel="Permission de la caméra requise">
      <Text style={styles.message} accessible={true} accessibilityRole="text">
        Nous avons besoins de votre permission pour utiliser la caméra
      </Text>
      <Button onPress={onRequest} title="Autoriser la caméra" accessibilityLabel="Autoriser la caméra" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.DARK,
    justifyContent: "center",
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
    color: colors.WHITE,
  },
});
