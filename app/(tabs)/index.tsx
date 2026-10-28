import { useCallback, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Easing,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useIsFocused } from "expo-router";

import ScanProductIcon from "../../assets/images/figma/scan-product.svg";
import ChoosAccount from "../../components/ChooseAccount";
import Header from "../../components/Header";
import ScanBadge from "../../components/ScanBadge";
import ScannerView, { ScannerViewHandle } from "../../components/ScannerView";
import { useScreenBottomInset } from "../../components/TabBar";
import MovementRow, { MOVEMENT_ROW_HEIGHT } from "../../components/ui-components/MovementRow";
import { colors } from "@/constants/colors";
import { isTablet } from "@/constants/layout";
import { useScanCamera } from "@/context/ScanCameraContext";
import { useStats } from "@/hooks/useStats";

const PHONE_VISIBLE_MOVEMENTS = 3;
const OPEN_DURATION_MS = 500;
const CLOSE_DURATION_MS = 400;

export default function Scan() {
  const { stats, isLoading } = useStats();
  const recentStats = stats?.slice(0, 5) ?? [];
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const tablet = isTablet();
  const scannerRef = useRef<ScannerViewHandle>(null);
  const { isCameraOpen, setCameraOpen, progress, homeOpacity } = useScanCamera();
  const bottomInset = useScreenBottomInset();
  const isFocused = useIsFocused();

  const animateTo = useCallback(
    (toValue: number, duration: number) => {
      Animated.timing(progress, {
        toValue,
        duration,
        easing: Easing.bezier(0.33, 0.0, 0.2, 1),
        useNativeDriver: true,
      }).start();
    },
    [progress],
  );

  const openCamera = () => {
    if (isCameraOpen) {
      return;
    }
    scannerRef.current?.open();
    setCameraOpen(true);
    animateTo(1, OPEN_DURATION_MS);
  };

  const closeCamera = useCallback(() => {
    scannerRef.current?.close();
    setCameraOpen(false);
    animateTo(0, CLOSE_DURATION_MS);
  }, [animateTo, setCameraOpen]);

  useEffect(() => {
    if (!isFocused && isCameraOpen) {
      closeCamera();
    }
  }, [isFocused, isCameraOpen, closeCamera]);

  useEffect(() => {
    if (!isCameraOpen) {
      return;
    }
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      closeCamera();
      return true;
    });
    return () => subscription.remove();
  }, [isCameraOpen, closeCamera]);

  const movementsOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isLandscape ? width : height],
  });
  const movementsOpacity = progress.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [1, 0.7, 0],
  });
  const cameraOpacity = progress.interpolate({
    inputRange: [0.25, 1],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={[styles.container, isLandscape && styles.containerLandscape]}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: cameraOpacity }]}
        pointerEvents={isCameraOpen ? "box-none" : "none"}
        importantForAccessibility={isCameraOpen ? "auto" : "no-hide-descendants"}
        accessibilityElementsHidden={!isCameraOpen}
      >
        <ScannerView ref={scannerRef} active={isCameraOpen} onClose={closeCamera} />
      </Animated.View>

      <Animated.View
        style={[styles.topSection, isLandscape && styles.topSectionLandscape, { opacity: homeOpacity }]}
        pointerEvents={isCameraOpen ? "none" : "box-none"}
        importantForAccessibility={isCameraOpen ? "no-hide-descendants" : "auto"}
        accessibilityElementsHidden={isCameraOpen}
      >
        <Header />

        <View style={styles.pillsRow}>
          <ChoosAccount />
          <ScanBadge />
        </View>

        <View style={styles.scanBlock}>
          <Pressable
            style={styles.scanButton}
            onPress={openCamera}
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
          <Text style={styles.scanLabel}>Scanner un produit</Text>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.movementsPanel,
          isLandscape && styles.movementsPanelLandscape,
          {
            paddingBottom: 8 + bottomInset,
            opacity: movementsOpacity,
            transform: [isLandscape ? { translateX: movementsOffset } : { translateY: movementsOffset }],
          },
        ]}
        pointerEvents={isCameraOpen ? "none" : "auto"}
        importantForAccessibility={isCameraOpen ? "no-hide-descendants" : "auto"}
        accessibilityElementsHidden={isCameraOpen}
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
            style={tablet ? undefined : styles.movementsList}
            ListEmptyComponent={<Text style={styles.emptyText}>Aucun mouvement récent</Text>}
          />
        )}
      </Animated.View>
    </View>
  );
}

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.DARK,
    overflow: "hidden",
  },
  containerLandscape: {
    flexDirection: "row",
  },
  topSectionLandscape: {
    flex: 0,
    width: "40%",
  },
  movementsPanelLandscape: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 28,
  },
  topSection: {
    flex: 1,
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
    flex: 1,
    justifyContent: "center",
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
  },
  movementsPanel: {
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
  },
  movementsSubtitle: {
    color: colors.MUTED,
    fontSize: 12,
    fontFamily: "Montserrat",
  },
  movementsList: {
    maxHeight: PHONE_VISIBLE_MOVEMENTS * MOVEMENT_ROW_HEIGHT,
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
