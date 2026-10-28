import { StyleSheet, Text, View } from "react-native";

import Header from "../../components/Header";
import { useScreenBottomInset } from "../../components/TabBar";
import { colors } from "@/constants/colors";

export default function Orders() {
  const bottomInset = useScreenBottomInset();

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={styles.band}>
        <Header />
        <Text style={styles.title} accessibilityRole="header">
          Commandes
        </Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.message}>Les commandes arrivent bientôt</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.SCREEN_BG,
  },
  band: {
    backgroundColor: colors.DARK,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 14,
  },
  title: {
    color: colors.WHITE,
    fontSize: 24,
    fontFamily: "SemiBold",
  },
  body: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  message: {
    color: colors.MUTED,
    fontSize: 15,
    fontFamily: "Montserrat",
    textAlign: "center",
  },
});
