import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import ScanProductIcon from "../../assets/images/figma/scan-product.svg";
import ChoosAccount from "../../components/ChooseAccount";
import ScanBadge from "../../components/ScanBadge";
import ScanOpenTransition from "../../components/ScanOpenTransition";
import MovementRow from "../../components/ui-components/MovementRow";
import { colors } from "@/constants/colors";
import { useStats } from "@/hooks/useStats";

export default function Scan() {
  const { stats, isLoading } = useStats();
  const recentStats = stats?.slice(0, 5) ?? [];
  const [openingCamera, setOpeningCamera] = useState(false);
  const [panelKey, setPanelKey] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const hasLeftForScanner = useRef(false);

  const restoreHome = useCallback(() => {
    setOpeningCamera(false);
    progress.stopAnimation();
    progress.setValue(0);
    setPanelKey((key) => key + 1);
  }, [progress]);

  useFocusEffect(
    useCallback(() => {
      // Only restore after leaving for the scanner — avoids remount flicker on first focus.
      if (hasLeftForScanner.current) {
        hasLeftForScanner.current = false;
        restoreHome();
      }
    }, [restoreHome]),
  );

  const handleScanPress = () => {
    if (openingCamera) {
      return;
    }
    setOpeningCamera(true);
  };

  const handleNavigate = useCallback(() => {
    hasLeftForScanner.current = true;
    router.push("/scanner");
  }, []);

  const handleTransitionFinished = useCallback(() => {
    // Keep Accueil settled under the scanner; focus restore remounts the panel on back.
    setOpeningCamera(false);
  }, []);

  const movementsTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 520],
  });
  const movementsOpacity = progress.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [1, 0.7, 0],
  });
  const scanButtonOpacity = progress.interpolate({
    inputRange: [0, 0.35, 0.7],
    outputRange: [1, 0.55, 0],
  });
  const labelOpacity = progress.interpolate({
    inputRange: [0, 0.3, 0.55],
    outputRange: [1, 0.4, 0],
  });
  const pillsOpacity = progress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [1, 0.9, 0.65],
  });

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <Animated.View style={[styles.pillsRow, { opacity: pillsOpacity }]}>
          <ChoosAccount />
          <ScanBadge />
        </Animated.View>

        <View style={styles.scanBlock}>
          <Animated.View style={{ opacity: scanButtonOpacity }}>
            <Pressable
              style={styles.scanButton}
              onPress={handleScanPress}
              disabled={openingCamera}
              accessible={true}
              accessibilityLabel="Scanner un produit"
              accessibilityHint="Ouvre la caméra pour scanner un code-barres"
              accessibilityRole="button"
            >
              <View style={styles.scanGlowOuter}>
                <View style={styles.scanGlowInner}>
                  <View style={styles.scanCircle}>
                    <ScanProductIcon width={68} height={68} accessible={false} />
                  </View>
                </View>
              </View>
            </Pressable>
          </Animated.View>
          <Animated.Text style={[styles.scanLabel, { opacity: labelOpacity }]}>
            Scanner un produit
          </Animated.Text>
        </View>
      </View>

      <Animated.View
        key={`movements-panel-${panelKey}`}
        style={[
          styles.movementsPanel,
          {
            opacity: movementsOpacity,
            transform: [{ translateY: movementsTranslateY }],
          },
        ]}
        accessible={true}
        accessibilityLabel="Derniers mouvements"
        accessibilityRole="list"
      >
        <View style={styles.movementsHeader}>
          <Text style={styles.movementsTitle}>Derniers mouvements</Text>
          <Text style={styles.movementsSubtitle}>5 derniers</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={colors.DARK}
            style={styles.loader}
            accessibilityLabel="Chargement des mouvements"
          />
        ) : (
          <FlatList
            data={recentStats}
            keyExtractor={(item, index) => `${item.designation}-${item.mvmtDateTime}-${index}`}
            renderItem={({ item }) => <MovementRow item={item} />}
            scrollEnabled={recentStats.length > 5 && !openingCamera}
            ListEmptyComponent={<Text style={styles.emptyText}>Aucun mouvement récent</Text>}
          />
        )}
      </Animated.View>

      <ScanOpenTransition
        visible={openingCamera}
        progress={progress}
        onNavigate={handleNavigate}
        onFinished={handleTransitionFinished}
      />
    </View>
  );
}

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.DARK,
    overflow: "hidden",
  },
  topSection: {
    paddingHorizontal: 20,
    gap: 18,
    zIndex: 10,
    overflow: "visible",
  },
  pillsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    zIndex: 10,
    overflow: "visible",
  },
  scanBlock: {
    alignItems: "center",
    paddingTop: 22,
    paddingBottom: 34,
    gap: 14,
    minHeight: 250,
  },
  scanButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  scanGlowOuter: {
    width: 216,
    height: 216,
    borderRadius: 108,
    backgroundColor: "rgba(18,161,154,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanGlowInner: {
    width: 188,
    height: 188,
    borderRadius: 94,
    backgroundColor: "rgba(18,161,154,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanCircle: {
    width: 164,
    height: 164,
    borderRadius: 82,
    backgroundColor: colors.GREEN_DARK,
    alignItems: "center",
    justifyContent: "center",
  },
  scanLabel: {
    marginTop: 14,
    color: colors.WHITE,
    fontSize: 19,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  movementsPanel: {
    flex: 1,
    backgroundColor: colors.WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    paddingHorizontal: 20,
    zIndex: 5,
  },
  movementsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  movementsTitle: {
    color: colors.DARK,
    fontSize: 16,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  movementsSubtitle: {
    color: colors.MUTED,
    fontSize: 12,
    fontFamily: "Montserrat",
    fontWeight: "400",
  },
  loader: {
    marginTop: 24,
  },
  emptyText: {
    marginTop: 20,
    color: colors.MUTED,
    fontSize: 14,
    fontFamily: "Montserrat",
    textAlign: "center",
  },
});
