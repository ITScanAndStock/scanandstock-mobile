// import react
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { Ref } from "react";

// import react native
import {
  Alert,
  Button,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";

// import expo
import {
  BarcodeScanningResult,
  BarcodeType,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { useAudioPlayer } from "expo-audio";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// import components
import CloseIcon from "../assets/images/figma/close.svg";
import InformationBanner from "@/components/ui-components/InformationBanner";
import { colors } from "@/constants/colors";
import { useAccount } from "@/context/AccountContext";
import { AxiosErrorType } from "@/model/ApiError";
import ToastService from "@/services/ToastService";
import MouvementButton from "./MouvementButton";
import ScanBadge from "./ScanBadge";
import ScanLoader from "./ScanLoader";
import { useStats } from "../hooks/useStats";
import { Method } from "../model/Stock";
import ProductService from "../services/ProductService";

const audioSourceSucces = require("../assets/sounds/ok.mp3");
const audioSourceError = require("../assets/sounds/error.mp3");
const INITIAL_METHOD = Method.decrease;
const BANNER_DURATION_MS = 5000;
const OVERLAY_CARD_MAX_WIDTH = 560;

export type ScannerViewHandle = {
  open: () => void;
  close: () => void;
};

type ScannerViewProps = {
  active: boolean;
  onClose: () => void;
  ref?: Ref<ScannerViewHandle>;
};

export default function ScannerView({ active, onClose, ref }: ScannerViewProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const activeRef = useRef(active);
  const insets = useSafeAreaInsets();
  const [isScanning, setIsScanning] = useState<boolean>(true);

  const playerSuccess = useAudioPlayer(audioSourceSucces);
  const playerError = useAudioPlayer(audioSourceError);

  const typeOfAcceptScan: BarcodeType[] = useMemo(
    () => [
      "qr",
      "aztec",
      "codabar",
      "code128",
      "code39",
      "code93",
      "datamatrix",
      "ean13",
      "ean8",
      "itf14",
      "pdf417",
      "upc_a",
      "upc_e",
    ],
    [],
  );

  const { refresh: refreshStats, stats } = useStats();
  const [scannedCode, setScannedCode] = useState("");
  const [scanCount, setScanCount] = useState(0);
  const [method, setMethod] = useState(INITIAL_METHOD);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBadgeProcessing, setIsBadgeProcessing] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const { isTracingEnabled, activeBadgeId, activeAccount, getBadge, resetAfterTimeout } =
    useAccount();

  const processingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const badgeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const badgeProcessingRef = useRef(false);

  const lastScan = stats && stats.length > 0 ? stats[0] : null;
  const lastScanIncrease =
    lastScan?.type === "increase" || lastScan?.type === "in" || (lastScan?.quantity ?? 0) > 0;
  const lastScanQty = Math.abs(lastScan?.quantity ?? 1);

  const handleMethodChange = useCallback((newMethod: Method) => {
    setMethod(newMethod);

    if (newMethod === Method.decrease) {
      setShowBanner(true);
      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
      }
      bannerTimeoutRef.current = setTimeout(() => {
        setShowBanner(false);
      }, BANNER_DURATION_MS);
    } else {
      setShowBanner(false);
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        activeRef.current = true;
        setScannedCode("");
        setScanCount(0);
        setIsScanning(true);
        handleMethodChange(INITIAL_METHOD);
        cameraRef.current?.resumePreview();
      },
      close: () => {
        activeRef.current = false;
        for (const timer of [timeoutRef, bannerTimeoutRef, badgeTimeoutRef]) {
          if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
          }
        }
        badgeProcessingRef.current = false;
        setIsBadgeProcessing(false);
        cameraRef.current?.pausePreview();
      },
    }),
    [handleMethodChange],
  );

  const handleCameraReady = () => {
    if (!activeRef.current) {
      cameraRef.current?.pausePreview();
    }
  };

  const handleBadgeConnexion = async ({ data }: BarcodeScanningResult) => {
    if (badgeProcessingRef.current || activeBadgeId !== null) return;

    badgeProcessingRef.current = true;
    setIsBadgeProcessing(true);
    setIsScanning(false);
    Vibration.vibrate(100);
    try {
      await getBadge(data);
      playerSuccess.seekTo(0);
      playerSuccess.play();
    } catch (error) {
      if (__DEV__) {
        console.error("❌ Erreur lors du scan du badge:", error);
      }
      playerError.seekTo(0);
      playerError.play();
    } finally {
      badgeTimeoutRef.current = setTimeout(() => {
        onClose();
        badgeProcessingRef.current = false;
        setIsBadgeProcessing(false);
        setIsScanning(true);
      }, 800);
    }
  };

  const handleBarcodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      const { data } = result;

      if (!isScanning || !data || processingRef.current) {
        return;
      }

      const cleanedCode = data.replace(/\x1D/g, "$");

      if (!cleanedCode || cleanedCode.length < 4 || cleanedCode.length > 100) {
        if (__DEV__) {
          console.warn("⚠️ Code-barres invalide (longueur):", cleanedCode);
        }
        return;
      }

      if (cleanedCode !== scannedCode) {
        setScannedCode(cleanedCode);
        setScanCount(1);
        return;
      }

      if (cleanedCode === scannedCode) {
        if (scanCount >= 2) {
          processingRef.current = true;
          setIsProcessing(true);
          setIsScanning(false);

          Vibration.vibrate(100);

          ProductService.scan(cleanedCode, method)
            .then(() => {
              refreshStats();
              playerSuccess.seekTo(0);
              playerSuccess.play();
            })
            .catch((error: AxiosErrorType) => {
              if (__DEV__) {
                console.error("❌ Erreur lors du scan:", error);
                console.warn("erreur repéré : ", error);
              }

              if (error.response?.status === 409) {
                Alert.alert(
                  "Attention : péremption plus proche détectée",
                  "Un autre lot de ce produit expire avant celui-ci. Voulez-vous tout de même sortir ce lot ?",
                  [
                    {
                      text: "Annuler",
                      style: "cancel",
                      onPress: () => ToastService.info("Vous avez annulé le scan"),
                    },
                    {
                      text: "Forcer la sortie",
                      style: "destructive",
                      onPress: () => {
                        ProductService.scan(cleanedCode, method, true)
                          .then(() => {
                            refreshStats();
                            playerSuccess.seekTo(0);
                            playerSuccess.play();
                          })
                          .catch((forcedError) => {
                            if (__DEV__) {
                              console.error("❌ Erreur lors du scan forcé:", forcedError);
                            }
                            playerError.seekTo(0);
                            playerError.play();
                          });
                      },
                    },
                  ],
                );
              } else {
                playerError.seekTo(0);
                playerError.play();
              }
            })
            .finally(() => {
              setIsProcessing(false);
              processingRef.current = false;
            });

          setScannedCode("");
          setScanCount(0);

          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(() => {
            setIsScanning(true);
          }, 2000);
        } else {
          setScanCount((prev) => prev + 1);
        }
      }
    },
    [isScanning, scannedCode, scanCount, method, refreshStats, playerSuccess, playerError],
  );

  const barcodeScannerSettings = useMemo(
    () => ({
      barcodeTypes: typeOfAcceptScan,
    }),
    [typeOfAcceptScan],
  );

  const handleScan = ({ data }: BarcodeScanningResult) => {
    if (!activeRef.current || badgeProcessingRef.current || processingRef.current) return;
    if (isTracingEnabled && activeBadgeId === null) {
      handleBadgeConnexion({ data } as BarcodeScanningResult);
    } else {
      handleBarcodeScanned({ data } as BarcodeScanningResult);
      if (activeBadgeId !== "") {
        resetAfterTimeout();
      }
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
      }
      if (badgeTimeoutRef.current) {
        clearTimeout(badgeTimeoutRef.current);
      }
    };
  }, []);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View
        style={styles.container}
        accessible={true}
        accessibilityLabel="Permission de la caméra requise"
      >
        <Text style={styles.message} accessible={true} accessibilityRole="text">
          Nous avons besoins de votre permission pour utiliser la caméra
        </Text>
        <Button
          onPress={requestPermission}
          title="Autoriser la caméra"
          accessibilityLabel="Autoriser la caméra"
        />
        <Pressable
          style={[styles.closeBtn, styles.permissionCloseBtn, { bottom: 16 + insets.bottom }]}
          onPress={onClose}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Fermer la caméra"
        >
          <CloseIcon width={22} height={22} accessible={false} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        active={active}
        style={styles.camera}
        onCameraReady={handleCameraReady}
        barcodeScannerSettings={barcodeScannerSettings}
        onBarcodeScanned={handleScan}
      />

      <View
        style={[styles.overlay, { paddingBottom: 16 + insets.bottom }]}
        pointerEvents={active ? "box-none" : "none"}
      >
        <View style={styles.topRow} pointerEvents="box-none">
          <View style={styles.accountChip} accessible={true} accessibilityLabel={`Compte actif: ${activeAccount?.name}`}>
            <Text style={styles.accountChipText} numberOfLines={1}>
              {activeAccount?.name ?? "Compte"}
            </Text>
          </View>
          <ScanBadge tone="overlay" />
        </View>

        {showBanner && method === Method.decrease ? (
          <View style={styles.bannerWrap}>
            <View style={styles.bannerCard}>
              <InformationBanner title="Attention la sortie de stock est activée" />
            </View>
          </View>
        ) : null}

        <View style={styles.viewfinder} pointerEvents="none">
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        <View style={styles.bottomBlock}>
          {lastScan ? (
            <View
              style={styles.lastScanCard}
              accessible={true}
              accessibilityLabel={`Dernier scan: ${lastScan.designation}, ${lastScanIncrease ? "+" : "−"}${lastScanQty}`}
            >
              <View style={styles.lastScanText}>
                <Text style={styles.lastScanLabel}>Dernier scan</Text>
                <Text style={styles.lastScanName} numberOfLines={1}>
                  {lastScan.designation}
                </Text>
              </View>
              <View
                style={[
                  styles.lastScanBadge,
                  lastScanIncrease ? styles.lastScanBadgeIn : styles.lastScanBadgeOut,
                ]}
              >
                <Text
                  style={[
                    styles.lastScanBadgeText,
                    lastScanIncrease ? styles.lastScanBadgeTextIn : styles.lastScanBadgeTextOut,
                  ]}
                >
                  {lastScanIncrease ? `+${lastScanQty}` : `−${lastScanQty}`}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.controlsRow}>
            <MouvementButton method={method} setMethod={handleMethodChange} />
            <Pressable
              style={styles.closeBtn}
              onPress={onClose}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Fermer la caméra"
            >
              <CloseIcon width={22} height={22} accessible={false} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScanLoader visible={isProcessing || isBadgeProcessing} />
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
  camera: {
    ...StyleSheet.absoluteFill,
  },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 30,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    // Root layout already reserves the status-bar inset — keep a tiny gap only.
    paddingTop: 8,
  },
  accountChip: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: colors.PILL_OVERLAY,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: "55%",
  },
  accountChipText: {
    color: colors.WHITE,
    fontSize: 14,
    fontFamily: "SemiBold",
  },
  bannerWrap: {
    position: "absolute",
    top: 110,
    left: 16,
    right: 16,
    alignItems: "center",
  },
  bannerCard: {
    width: "100%",
    maxWidth: OVERLAY_CARD_MAX_WIDTH,
  },
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
  bottomBlock: {
    gap: 12,
  },
  lastScanCard: {
    alignSelf: "center",
    width: "100%",
    maxWidth: OVERLAY_CARD_MAX_WIDTH,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.WHITE,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  lastScanText: {
    flex: 1,
  },
  lastScanLabel: {
    color: colors.MUTED,
    fontSize: 12,
    fontFamily: "SemiBold",
  },
  lastScanName: {
    color: colors.DARK,
    fontSize: 14,
    fontFamily: "SemiBold",
  },
  lastScanBadge: {
    minWidth: 52,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  lastScanBadgeIn: {
    backgroundColor: colors.INCREASE_BG,
  },
  lastScanBadgeOut: {
    backgroundColor: colors.DECREASE_BG,
  },
  lastScanBadgeText: {
    fontSize: 14,
    fontFamily: "SemiBold",
  },
  lastScanBadgeTextIn: {
    color: colors.INCREASE_TEXT,
  },
  lastScanBadgeTextOut: {
    color: colors.DECREASE_TEXT,
  },
  controlsRow: {
    alignSelf: "center",
    width: "100%",
    maxWidth: OVERLAY_CARD_MAX_WIDTH,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  permissionCloseBtn: {
    position: "absolute",
    right: 16,
  },
  closeBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.WHITE,
    alignItems: "center",
    justifyContent: "center",
  },
});
