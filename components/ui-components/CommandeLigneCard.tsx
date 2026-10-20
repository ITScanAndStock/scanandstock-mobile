import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import {
  CommandeLigne,
  formatLigneSubtitle,
  isLigneComplete,
} from "@/model/Commande";

type CommandeLigneCardProps = {
  ligne: CommandeLigne;
};

export default function CommandeLigneCard({ ligne }: CommandeLigneCardProps) {
  const complete = isLigneComplete(ligne);
  const progress = ligne.orderedQty > 0 ? Math.min(ligne.receivedQty / ligne.orderedQty, 1) : 0;

  return (
    <View
      style={styles.card}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`${ligne.designation}, ${ligne.receivedQty} sur ${ligne.orderedQty}, ${formatLigneSubtitle(ligne)}`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.designation} numberOfLines={1}>
          {ligne.designation}
        </Text>
        <Text style={styles.qty}>
          {ligne.receivedQty} / {ligne.orderedQty}
        </Text>
      </View>
      <Text style={styles.subtitle}>{formatLigneSubtitle(ligne)}</Text>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${progress * 100}%`,
              backgroundColor: complete ? colors.MUTED : colors.GREEN_DARK,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.WHITE,
    borderWidth: 1,
    borderColor: colors.CARD_BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  designation: {
    flex: 1,
    color: colors.DARK,
    fontSize: 14,
    fontFamily: "SemiBold",
    fontWeight: "700",
  },
  qty: {
    color: colors.DARK,
    fontSize: 13,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 3,
    color: colors.MUTED,
    fontSize: 12,
    fontFamily: "Montserrat",
    fontWeight: "400",
  },
  track: {
    marginTop: 10,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E6EAEC",
    overflow: "hidden",
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
});
