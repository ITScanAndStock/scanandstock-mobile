import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors } from "../constants/colors";

export default function Viewfinder({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.viewfinder, style]} pointerEvents="none">
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />
    </View>
  );
}

const styles = StyleSheet.create({
  viewfinder: {
    alignSelf: "center",
    width: 280,
    height: 200,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 38,
    height: 38,
    borderColor: colors.WHITE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 14,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 14,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 14,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 14,
  },
});
