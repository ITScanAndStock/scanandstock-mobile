import { type ReactNode, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Alert, BackHandler, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useIsFocused, useLocalSearchParams, useNavigation, useRoute, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CloseIcon from "../../../../assets/images/figma/close.svg";
import { LoadFailed, Loading } from "../../../../components/LoadState";
import PrimaryButton from "../../../../components/PrimaryButton";
import ReceiptCamera from "../../../../components/ReceiptCamera";
import ReceiptLineRow, { finishedAtStartCount } from "../../../../components/ReceiptLineRow";
import ReceiptLineSheet from "../../../../components/ReceiptLineSheet";
import ReceiptScanCard from "../../../../components/ReceiptScanCard";
import ScanBadge from "../../../../components/ScanBadge";
import { colors } from "@/constants/colors";
import { useAccount } from "@/context/AccountContext";
import { useScanCamera } from "@/context/ScanCameraContext";
import { useCanReceive } from "@/hooks/useCanReceive";
import { useGoToOrderList } from "@/hooks/useGoToOrderList";
import { useOrderItems } from "@/hooks/useOrderItems";
import { useSavedReceiptDraft } from "@/hooks/useSavedReceiptDraft";
import { scanFeedback, type ScanSounds, useScanSounds } from "@/hooks/useScanSounds";
import { useStats } from "@/hooks/useStats";
import type { Order, OrderItem } from "@/model/Order";
import { formatOrderDate } from "@/services/OrderDate";
import { plural } from "@/services/Plural";
import { type ReceiptBanner, receiptBanner } from "@/services/ReceiptBanner";
import type { DraftLine } from "@/services/ReceiptDraft";
import { openReceiptDraft, type SavedReceiptDraft } from "@/services/ReceiptDraftStore";
import { type LineForm, saveLineForm } from "@/services/ReceiptLineEdit";
import ReceiptRecognizer from "@/services/ReceiptRecognizer";
import { createReceiptScan } from "@/services/ReceiptScan";
import { createReceiptSend, linesReceivedMeanwhile, type SendOutcome } from "@/services/ReceiptSend";
import ToastService from "@/services/ToastService";
import OrderCache from "@/state/OrderCache";

export default function OrderReceipt() {
  const navigation = useNavigation();
  const route = useRoute();
  const router = useRouter();
  const goToList = useGoToOrderList();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { activeAccount } = useAccount();
  const accountId = activeAccount?.id;
  const order = accountId ? OrderCache.get(accountId, Number(orderId)) : undefined;
  const canReceive = useCanReceive(order?.orderId);
  const allowed = !!order && canReceive === true;
  const { items, failed, retry } = useOrderItems(accountId, allowed ? order : undefined);
  const saved = useSavedReceiptDraft(accountId, allowed ? order.orderId : undefined);
  const { setReceiptOpen } = useScanCamera();

  const leave = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.replace({ pathname: "/orders/[orderId]", params: { orderId } });
    }
  }, [navigation, router, orderId]);

  // Opened by a deep link: the header comes from the list's cache, the right from the token.
  useEffect(() => {
    if (!accountId) {
      return;
    }
    if (!order) {
      goToList();
    } else if (canReceive === false) {
      leave();
    }
  }, [accountId, order, canReceive, goToList, leave]);

  useFocusEffect(
    useCallback(() => {
      if (!allowed) {
        return;
      }
      setReceiptOpen(true);
      return () => {
        setReceiptOpen(false);
        // A deep link takes the focus away: the receipt closes, so the Orders tab never shows it again.
        const state = navigation.getState();
        if (!navigation.isFocused() && state?.routes.some((candidate) => candidate.key === route.key)) {
          navigation.dispatch({ type: "POP", payload: { count: 1 }, source: route.key, target: state.key });
        }
      };
    }, [allowed, setReceiptOpen, navigation, route.key]),
  );

  if (!order || !allowed) {
    return <View style={styles.container} />;
  }
  if (items && saved) {
    return <ReceiptSession order={order} items={items} saved={saved} onLeave={leave} onAccountChanged={goToList} />;
  }
  return (
    <ReceiptLayout order={order} onLeave={leave} header={null}>
      {failed ? (
        <LoadFailed message="Impossible de charger les lignes de la commande" onRetry={retry} />
      ) : (
        <Loading label="Chargement des lignes" />
      )}
    </ReceiptLayout>
  );
}

type ReceiptSessionProps = {
  order: Order;
  items: readonly OrderItem[];
  saved: SavedReceiptDraft;
  onLeave: () => void;
  onAccountChanged: () => void;
};

type SessionOptions = {
  orderId: number;
  items: readonly OrderItem[];
  saved: SavedReceiptDraft;
  sounds: ScanSounds;
  onBanner: (banner: ReceiptBanner) => void;
  onAccountChanged: () => void;
  refreshMovements: () => void;
  isBadgeValid: () => boolean;
  connectBadge: (code: string) => Promise<boolean>;
  scanSent: () => void;
};

function createSession({
  orderId,
  items,
  saved,
  sounds,
  onBanner,
  onAccountChanged,
  refreshMovements,
  isBadgeValid,
  connectBadge,
  scanSent,
}: SessionOptions) {
  const { draft, touched, forget } = openReceiptDraft(saved, items, Date.now);
  const sender = createReceiptSend({ draft, orderId, refreshMovements, scanSent, forgetDraft: forget });
  const scan = createReceiptScan({
    draft,
    recognize: (code, group, apply) => ReceiptRecognizer.recognize(code, group, apply),
    onRecognized: (recognition) => {
      onBanner(receiptBanner(recognition, draft.lines()));
      // The second code of a box only completes the unit the first one counted.
      if (recognition.kind === "added" && recognition.merged) {
        return;
      }
      scanFeedback(sounds, recognition.kind === "added");
    },
    onAccountChanged,
    badge: { isValid: isBadgeValid, connect: connectBadge },
    onBadge: (connected) => scanFeedback(sounds, connected),
  });
  return { draft, scan, sender, touched };
}

const BADGE_PROMPT: ReceiptBanner = {
  tone: "error",
  title: "Scannez votre badge",
  detail: "Votre cabinet trace les mouvements de stock",
};

function ReceiptSession({ order, items, saved, onLeave, onAccountChanged }: ReceiptSessionProps) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { cameraTurn } = useScanCamera();
  const navigation = useNavigation();
  const sounds = useScanSounds();
  const { refresh: refreshStats } = useStats();
  const { getBadge, isBadgeValid, scanSent, isTracingEnabled, activeBadgeName } = useAccount();
  const [banner, setBanner] = useState<ReceiptBanner | null>(null);
  const [sending, setSending] = useState(false);
  const [sheetItemId, setSheetItemId] = useState<number | null>(null);
  const [{ draft, scan, sender, touched }] = useState(() =>
    createSession({
      orderId: order.orderId,
      items,
      saved,
      sounds,
      onBanner: setBanner,
      onAccountChanged,
      refreshMovements: () => void refreshStats(),
      isBadgeValid,
      connectBadge: getBadge,
      scanSent,
    }),
  );
  const phase = useSyncExternalStore(scan.subscribe, scan.phase);

  useEffect(() => () => scan.close(), [scan]);

  useEffect(() => {
    if (touched > 0) {
      ToastService.info(...linesReceivedMeanwhile(touched));
    }
  }, [touched]);

  useEffect(() => {
    if (phase !== "resume") {
      return;
    }
    Alert.alert(
      `Réception commencée par ${scan.startedBy() ?? "un autre badge"}`,
      "Reprise, elle partira sous votre badge.",
      [
        { text: "Recommencer", style: "destructive", onPress: scan.restart },
        { text: "Reprendre", onPress: scan.resume },
      ],
      { cancelable: false },
    );
  }, [phase, scan]);

  const closeSheet = useCallback(() => {
    scan.closeSheet();
    setSheetItemId(null);
  }, [scan]);

  useEffect(() => {
    if (sheetItemId === null) {
      return;
    }
    // Registered after the navigator's handler, so Back closes the sheet before leaving the receipt.
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      closeSheet();
      return true;
    });
    return () => subscription.remove();
  }, [sheetItemId, closeSheet]);

  const openSheet = useCallback(
    (orderItemId: number) => {
      // Not while a code is being recognized: its answer would change the line under the sheet.
      if (scan.openSheet(Date.now())) {
        setSheetItemId(orderItemId);
      }
    },
    [scan],
  );

  const showOutcome = (outcome: SendOutcome) => {
    switch (outcome.kind) {
      case "sent":
        // A logout during the send unmounts the stack: nothing to show then.
        if (navigation.isFocused()) {
          // New routes without keys: the list beneath the confirmation is remounted, hence reloaded.
          navigation.dispatch({
            type: "RESET",
            payload: {
              index: 1,
              routes: [{ name: "index" }, { name: "received/[orderId]", params: { orderId: String(order.orderId) } }],
            },
          });
        }
        return;
      case "accountChanged":
        onAccountChanged();
        return;
      case "linesChanged":
        ToastService.info(...linesReceivedMeanwhile(outcome.count));
        return;
      case "confirmUncertain":
        Alert.alert("Envoi incertain", "Vérifiez que la réception n'est pas déjà passée.", [
          { text: "Annuler", style: "cancel" },
          { text: "Envoyer quand même", onPress: () => requestSend(true) },
        ]);
        return;
      case "badgeRefused":
        ToastService.error(...outcome.toast);
        scan.badgeRefused();
        return;
      case "failed":
        ToastService.error(...outcome.toast);
        return;
      case "busy":
      case "empty":
        return;
    }
  };

  const send = async (confirmedUncertain: boolean) => {
    setSending(true);
    const outcome = await sender.send(confirmedUncertain);
    setSending(false);
    showOutcome(outcome);
  };

  const requestSend = (confirmedUncertain: boolean) => scan.requestSend(() => void send(confirmedUncertain));

  const lines = draft.lines();
  const scanned = draft.count();
  const finished = finishedAtStartCount(lines);
  const sheetLine = lines.find((line) => line.item.orderItemId === sheetItemId);

  const saveSheet = (line: DraftLine, form: LineForm) => {
    const saved = saveLineForm(draft, line, form);
    if (saved.kind === "saved") {
      closeSheet();
    }
    return saved;
  };

  return (
    <ReceiptLayout
      order={order}
      onLeave={onLeave}
      camera={
        cameraTurn.receipt && isFocused ? <ReceiptCamera onScanned={({ data }) => !sender.isSending() && scan.frame(data, Date.now())} /> : null
      }
      banner={phase === "badge" ? BADGE_PROMPT : banner}
      overlay={
        sheetLine ? (
          <ReceiptLineSheet
            key={sheetLine.item.orderItemId}
            line={sheetLine}
            onSave={(form) => saveSheet(sheetLine, form)}
            onCancel={closeSheet}
          />
        ) : null
      }
      header={
        <>
          <Text style={styles.sheetTitle}>{plural(scanned, "produit scanné", "produits scannés")}</Text>
          {phase === "products" && isTracingEnabled === true && !activeBadgeName ? (
            <Text style={styles.badgeNote}>Badge à rescanner avant l&apos;envoi</Text>
          ) : finished > 0 ? (
            <Text style={styles.sheetNote}>{plural(finished, "ligne déjà terminée", "lignes déjà terminées")}</Text>
          ) : null}
        </>
      }
    >
      <FlatList
        data={lines}
        keyExtractor={(line) => String(line.item.orderItemId)}
        renderItem={({ item }) => (
          <ReceiptLineRow line={item} onPress={() => openSheet(item.item.orderItemId)} disabled={sending} />
        )}
        contentContainerStyle={styles.lines}
      />
      <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
        <PrimaryButton
          label={sending ? "Envoi en cours…" : `Réceptionner ${plural(scanned, "produit")}`}
          onPress={() => requestSend(false)}
          disabled={scanned === 0 || sending || phase !== "products"}
          busy={sending}
        />
      </View>
    </ReceiptLayout>
  );
}

type ReceiptLayoutProps = {
  order: Order;
  onLeave: () => void;
  camera?: ReactNode;
  banner?: ReceiptBanner | null;
  overlay?: ReactNode;
  header: ReactNode;
  children: ReactNode;
};

function ReceiptLayout({ order, onLeave, camera, banner, overlay, header, children }: ReceiptLayoutProps) {
  return (
    <View style={styles.container}>
      <View style={styles.cameraArea}>
        {camera}
        <View style={styles.topRow} pointerEvents="box-none">
          <Pressable style={styles.close} onPress={onLeave} accessibilityRole="button" accessibilityLabel="Quitter la réception">
            <CloseIcon width={22} height={22} accessible={false} />
          </Pressable>
          <View style={styles.titlePill}>
            <Text style={styles.titleText} numberOfLines={1} accessibilityRole="header">
              Réception · commande du {formatOrderDate(order.orderDate)}
            </Text>
          </View>
        </View>
        <View style={styles.badgeRow} pointerEvents="box-none">
          <ScanBadge tone="overlay" />
        </View>
        {banner ? <ReceiptScanCard banner={banner} style={styles.banner} /> : null}
      </View>
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>{header}</View>
        {children}
      </View>
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.RAIL_BG,
  },
  cameraArea: {
    flex: 1,
  },
  topRow: {
    position: "absolute",
    top: 8,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.WHITE,
    alignItems: "center",
    justifyContent: "center",
  },
  titlePill: {
    flexShrink: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    backgroundColor: colors.PILL_OVERLAY,
    justifyContent: "center",
  },
  titleText: {
    color: colors.WHITE,
    fontSize: 14,
    fontFamily: "SemiBold",
  },
  badgeRow: {
    position: "absolute",
    top: 60,
    left: 16,
    flexDirection: "row",
  },
  badgeNote: {
    color: colors.DECREASE_TEXT,
    fontSize: 12,
    fontFamily: "SemiBold",
  },
  banner: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 40,
  },
  sheet: {
    flex: 1,
    marginTop: -28,
    backgroundColor: colors.WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 8,
  },
  sheetTitle: {
    color: colors.DARK,
    fontSize: 16,
    fontFamily: "SemiBold",
  },
  lines: {
    paddingBottom: 8,
  },
  footer: {
    paddingTop: 10,
  },
  sheetNote: {
    color: colors.MUTED,
    fontSize: 12,
    fontFamily: "Montserrat",
  },
});
