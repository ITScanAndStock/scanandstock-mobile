// import reacts native
import { ActivityIndicator, StyleSheet, View } from "react-native";

// import expo
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";

// import svg and icons
import Badge from "../../assets/images/badge.svg";
import QrCode from "../../assets/images/qr-code.svg";
import ScanLine from "../../assets/images/scan-line.svg";

// import components
import ChoosAccount from "../../components/ChooseAccount";
import ScanBadge from "../../components/ScanBadge";
import ThemedText from "../../components/ui-components/ThemedText";

// importe constants
import { colors } from "@/constants/colors";
import { useAccount } from "@/context/AccountContext";
import { useStats } from "@/hooks/useStats";
import Stat from "../../components/ui-components/Stat";

export default function Scan() {
  const { isTracingEnabled, activeBadgeId } = useAccount();
  const { stats, isLoading } = useStats();

  return (
    <View style={styles.container}>
      <ChoosAccount />
      {activeBadgeId !== null ? (
        <QrCode
          width={140}
          height={140}
          style={styles.svg}
          accessible={true}
          accessibilityLabel="Badge ScanAndStock"
          accessibilityRole="image"
        />
      ) : (
        <Badge
          width={160}
          height={160}
          style={styles.svg}
          accessible={true}
          accessibilityLabel="Badge ScanAndStock"
          accessibilityRole="image"
        />
      )}

      {isTracingEnabled === true ? <ScanBadge /> : null}

      <Link
        style={styles.btn}
        href="/scanner"
        accessible={true}
        accessibilityLabel="Scanner un produit"
        accessibilityHint="Ouvre la caméra pour scanner un code-barres"
        accessibilityRole="button"
      >
        <View style={styles.btnContent}>
          <ScanLine
            width={24}
            height={24}
            accessible={false}
            importantForAccessibility="no"
          />
          <ThemedText variant="textBtn"> scannez</ThemedText>
        </View>
      </Link>
      <View
        style={styles.historyContainer}
        accessible={true}
        accessibilityLabel="Historique des dernières statistiques"
        accessibilityRole="list"
      >
        {stats && (
          <LinearGradient
            style={styles.backgroundGradient}
            colors={["#12A19A40", "#12A19A1C"]}
          >
            {isLoading ? (
              <ActivityIndicator
                size="large"
                color={colors.DARK}
                accessibilityLabel="Chargement des statistiques"
              />
            ) : (
              stats?.map((stat, index) => {
                return <Stat key={index} {...stat} />;
              })
            )}
          </LinearGradient>
        )}
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  svg: {
    marginTop: 50,
    marginBottom: 20,
  },
  btn: {
    width: "100%",
    maxWidth: 400,
    borderWidth: 3,
    borderColor: colors.DARK,
    borderRadius: 25,
    padding: 10,
    textAlign: "center",
  },
  btnContent: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  historyContainer: {
    width: "100%",
    maxWidth: 500,
    padding: 10,
    boxSizing: "border-box",
    justifyContent: "space-around",
    flex: 1,
    maxHeight: 400,
  },
  backgroundGradient: {
    width: "100%",
    height: "80%",
    maxHeight: 250,
    paddingVertical: 5,
    paddingHorizontal: 10,
    boxSizing: "border-box",
    justifyContent: "space-around",
    alignItems: "center",
    borderRadius: 15,
  },
});
