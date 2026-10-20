import { colors } from "@/constants/colors";
import { StyleSheet, Text, View } from "react-native";
import Exclamation from "../../assets/images/exclamation-triangle.svg";

type NoBadgeScannedProps = {
  tone?: "default" | "overlay";
};

export default function NoBadgeScanned({ tone = "default" }: NoBadgeScannedProps) {
  return (
    <View
      style={[styles.container, tone === "overlay" && styles.containerOverlay]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLabel="Scannez votre badge pour continuer"
      accessibilityLiveRegion="polite"
    >
      <Exclamation height={18} width={18} color={colors.WHITE} accessible={false} />
      <Text style={styles.text}>Badge</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: colors.PILL,
  },
  containerOverlay: {
    backgroundColor: "rgba(22,30,34,0.72)",
  },
  text: {
    color: colors.WHITE,
    fontSize: 14,
    fontFamily: "SemiBold",
    fontWeight: "600",
  },
});
