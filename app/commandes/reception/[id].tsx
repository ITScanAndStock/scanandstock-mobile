import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";
import {
  BarcodeScanningResult,
  BarcodeType,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";

import CheckIcon from "@/assets/images/figma/check.svg";
import CloseIcon from "@/assets/images/figma/close-light.svg";
import ReceptionCorrectionSheet from "@/components/ReceptionCorrectionSheet";
import ReceptionLigneRow, {
  ReceptionLigneRowData,
} from "@/components/ui-components/ReceptionLigneRow";
import { colors } from "@/constants/colors";
import { getCommandeById } from "@/data/mockCommandes";
import { formatCommandeTitle } from "@/model/Commande";

/** Session mock aligned with the Figma “Réception en scan” frame. */
function buildInitialLines(commandeId: string): ReceptionLigneRowData[] {
  if (commandeId === "cmd-20251018") {
    return [
      {
        id: "l1",
        designation: "Composite Filtek Z250 A2 seringue 4 g",
        orderedQty: 6,
        scannedQty: 3,
        lot: "LT2291",
        expiration: "03/2028",
      },
      {
        id: "l2",
        designation: "Gants nitrile taille M, boîte de 100",
        orderedQty: 6,
        scannedQty: 6,
        lot: "GN884",
        expiration: "11/2029",
      },
      {
        id: "l3",
        designation: "Fraise diamantée 856 016",
        orderedQty: 5,
        scannedQty: 0,
      },
      {
        id: "l5",
        designation: "Articaïne 4 % adrénalinée 1/100 000",
        orderedQty: 2,
        scannedQty: 0,
      },
    ];
  }

  const commande = getCommandeById(commandeId);
  return (
    commande?.lines
      .filter((l) => l.receivedQty < l.orderedQty)
      .map((l) => ({
        id: l.id,
        designation: l.designation,
        orderedQty: l.orderedQty,
        scannedQty: l.receivedQty,
      })) ?? []
  );
}

type LastScanToast = {
  designation: string;
  lot?: string | null;
  expiration?: string | null;
  delta: number;
};

export default function CommandeReceptionScan() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const commandeId = Array.isArray(id) ? id[0] : id;
  const commande = getCommandeById(commandeId);
  const [permission, requestPermission] = useCameraPermissions();

  const [lines, setLines] = useState<ReceptionLigneRowData[]>(() =>
    buildInitialLines(commandeId ?? ""),
  );
  const [lastScan, setLastScan] = useState<LastScanToast | null>({
    designation: "Composite Filtek Z250 A2",
    lot: "LT2291",
    expiration: "03/2028",
    delta: 1,
  });
  const [highlightedId, setHighlightedId] = useState<string | null>("l1");
  const [editingLine, setEditingLine] = useState<ReceptionLigneRowData | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const processingRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const title = commande
    ? `Réception · ${formatCommandeTitle(commande.orderedAt).replace("Commande ", "commande ")}`
    : "Réception";

  const scannedProducts = useMemo(
    () => lines.reduce((sum, line) => sum + line.scannedQty, 0),
    [lines],
  );
  const completedLines = useMemo(
    () => lines.filter((line) => line.scannedQty >= line.orderedQty && line.orderedQty > 0).length,
    [lines],
  );

  const barcodeTypes: BarcodeType[] = useMemo(
    () => ["qr", "code128", "code39", "ean13", "ean8", "upc_a", "upc_e", "datamatrix"],
    [],
  );

  const applyScan = useCallback(() => {
    if (processingRef.current) {
      return;
    }
    processingRef.current = true;
    setIsScanning(false);
    Vibration.vibrate(80);

    setLines((prev) => {
      const next = prev.map((line) => ({ ...line }));
      const target =
        next.find((line) => line.scannedQty < line.orderedQty) ??
        next[0];
      if (!target || target.scannedQty >= target.orderedQty) {
        return prev;
      }
      target.scannedQty += 1;
      if (!target.lot) {
        target.lot = "SCAN";
        target.expiration = "—";
      }
      setHighlightedId(target.id);
      setLastScan({
        designation: target.designation.replace(/ seringue 4 g$/, ""),
        lot: target.lot,
        expiration: target.expiration,
        delta: 1,
      });
      return next;
    });

    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
    }
    resumeTimerRef.current = setTimeout(() => {
      processingRef.current = false;
      setIsScanning(true);
    }, 900);
  }, []);

  const handleBarcodeScanned = useCallback(
    (_result: BarcodeScanningResult) => {
      if (!isScanning || processingRef.current) {
        return;
      }
      applyScan();
    },
    [applyScan, isScanning],
  );

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
      }
    };
  }, []);

  const close = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/commandes");
    }
  };

  const shortDesignation = (designation: string) =>
    designation
      .replace(/ seringue 4 g$/, "")
      .replace(/, boîte de \d+$/, "");

  const confirmReception = () => {
    const receivedItems = lines
      .filter((line) => line.scannedQty > 0)
      .map((line) => ({
        designation: shortDesignation(line.designation),
        qty: line.scannedQty,
      }));
    const remaining = lines.reduce(
      (sum, line) => sum + Math.max(line.orderedQty - line.scannedQty, 0),
      0,
    );
    const status = remaining === 0 ? "receptionnee" : "partielle";

    router.replace({
      pathname: "/commandes/reception/confirmee/[id]",
      params: {
        id: commandeId,
        summary: JSON.stringify({
          total: scannedProducts,
          remaining,
          status,
          items: receivedItems,
        }),
      },
    });
  };

  if (!commande) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Commande introuvable</Text>
        <Pressable onPress={close} style={styles.missingBack}>
          <Text style={styles.missingBackText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permission}>
        <Text style={styles.permissionText}>Autorisez la caméra pour réceptionner</Text>
        <Button title="Autoriser la caméra" onPress={requestPermission} />
      </View>
    );
  }

  const openCorrection = (item: ReceptionLigneRowData) => {
    setEditingLine(item);
  };

  const openCorrectionFromToast = () => {
    const match = lines.find((line) => line.id === highlightedId) ?? lines[0];
    if (match) {
      openCorrection(match);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes }}
        onBarcodeScanned={isScanning && !editingLine ? handleBarcodeScanned : undefined}
      />

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topRow}>
          <Pressable
            style={styles.closeBtn}
            onPress={close}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Quitter la réception"
          >
            <CloseIcon width={20} height={20} accessible={false} />
          </Pressable>
          <View style={styles.titlePill}>
            <Text style={styles.titleText} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>

        <View style={styles.viewfinder} pointerEvents="none">
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        <View style={styles.sheet}>
          {lastScan ? (
            <Pressable
              style={styles.toast}
              onPress={openCorrectionFromToast}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Toast dernier scan: +${lastScan.delta} ${lastScan.designation}. Appuyer pour corriger`}
              accessibilityHint="Ouvre la correction de la ligne scannée"
            >
              <View style={styles.toastIcon}>
                <CheckIcon width={18} height={18} accessible={false} />
              </View>
              <View style={styles.toastText}>
                <Text style={styles.toastTitle} numberOfLines={1}>
                  +{lastScan.delta} {lastScan.designation}
                </Text>
                <Text style={styles.toastSubtitle} numberOfLines={1}>
                  Lot {lastScan.lot}
                  {lastScan.expiration ? ` · péremption ${lastScan.expiration}` : ""}
                </Text>
              </View>
            </Pressable>
          ) : null}

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{scannedProducts} produits scannés</Text>
            <Text style={styles.sheetSubtitle}>
              {completedLines} ligne{completedLines > 1 ? "s" : ""} déjà terminée
              {completedLines > 1 ? "s" : ""}
            </Text>
          </View>

          <FlatList
            data={lines}
            keyExtractor={(item) => item.id}
            style={styles.list}
            renderItem={({ item }) => (
              <ReceptionLigneRow
                item={item}
                highlighted={item.id === highlightedId}
                onPress={openCorrection}
              />
            )}
          />

          <View style={styles.footer}>
            <Pressable
              style={[styles.cta, scannedProducts === 0 && styles.ctaDisabled]}
              disabled={scannedProducts === 0}
              onPress={confirmReception}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Réceptionner ${scannedProducts} produits`}
            >
              <Text style={styles.ctaLabel}>Réceptionner {scannedProducts} produits</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ReceptionCorrectionSheet
        visible={editingLine !== null}
        line={editingLine}
        supplierName={commande.suppliers[0]}
        alreadyReceived={
          commande.lines.find((l) => l.id === editingLine?.id)?.receivedQty ?? 0
        }
        onClose={() => setEditingLine(null)}
        onSave={({ lineId, scannedQty, lot, expiration }) => {
          const previousQty = editingLine?.scannedQty ?? 0;
          const designation = (editingLine?.designation ?? "").replace(/ seringue 4 g$/, "");
          setLines((prev) =>
            prev.map((line) =>
              line.id === lineId
                ? {
                    ...line,
                    scannedQty,
                    lot,
                    expiration,
                  }
                : line,
            ),
          );
          setHighlightedId(lineId);
          setLastScan({
            designation,
            lot,
            expiration,
            delta: Math.max(scannedQty - previousQty, 1),
          });
          setEditingLine(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C2529",
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    // Root layout already reserves the status-bar inset — keep a tiny gap only.
    paddingTop: 8,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(22,30,34,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  titlePill: {
    flexShrink: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    backgroundColor: "rgba(22,30,34,0.72)",
    justifyContent: "center",
  },
  titleText: {
    color: colors.WHITE,
    fontSize: 14,
    fontFamily: "SemiBold",
    fontWeight: "700",
  },
  viewfinder: {
    alignSelf: "center",
    width: 260,
    height: 170,
    marginBottom: 24,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 34,
    height: 34,
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
  sheet: {
    backgroundColor: colors.WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingHorizontal: 20,
    maxHeight: "58%",
    minHeight: 360,
    overflow: "visible",
  },
  toast: {
    position: "absolute",
    top: -54,
    left: 16,
    right: 16,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.WHITE,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 9,
    elevation: 8,
  },
  toastIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.INCREASE_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  toastText: {
    flex: 1,
    minWidth: 0,
  },
  toastTitle: {
    color: colors.DARK,
    fontSize: 14,
    fontFamily: "SemiBold",
    fontWeight: "700",
  },
  toastSubtitle: {
    marginTop: 2,
    color: colors.MUTED,
    fontSize: 12,
    fontFamily: "Montserrat",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sheetTitle: {
    color: colors.DARK,
    fontSize: 16,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  sheetSubtitle: {
    color: colors.MUTED,
    fontSize: 12,
    fontFamily: "Montserrat",
    flexShrink: 1,
    textAlign: "right",
  },
  list: {
    flexGrow: 0,
  },
  footer: {
    // Root layout already reserves the home-indicator inset.
    paddingTop: 10,
    paddingBottom: 12,
  },
  cta: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.GREEN_DARK,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaLabel: {
    color: colors.WHITE,
    fontSize: 16,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  missing: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.SURFACE,
    gap: 16,
  },
  missingText: {
    color: colors.MUTED,
    fontSize: 16,
    fontFamily: "SemiBold",
  },
  missingBack: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.DARK,
  },
  missingBackText: {
    color: colors.WHITE,
    fontFamily: "SemiBold",
  },
  permission: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1C2529",
    gap: 16,
    padding: 24,
  },
  permissionText: {
    color: colors.WHITE,
    textAlign: "center",
    fontFamily: "SemiBold",
  },
});
