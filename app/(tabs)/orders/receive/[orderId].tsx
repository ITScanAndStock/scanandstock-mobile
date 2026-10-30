import { type ReactNode, useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, Vibration, View } from "react-native";
import { useFocusEffect, useIsFocused, useLocalSearchParams, useNavigation, useRoute, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CloseIcon from "../../../../assets/images/figma/close.svg";
import { LoadFailed, Loading } from "../../../../components/LoadState";
import ReceiptCamera from "../../../../components/ReceiptCamera";
import ReceiptLineRow, { finishedAtStartCount } from "../../../../components/ReceiptLineRow";
import ReceiptScanCard from "../../../../components/ReceiptScanCard";
import { colors } from "@/constants/colors";
import { useAccount } from "@/context/AccountContext";
import { useScanCamera } from "@/context/ScanCameraContext";
import { useCanReceive } from "@/hooks/useCanReceive";
import { useGoToOrderList } from "@/hooks/useGoToOrderList";
import { useOrderItems } from "@/hooks/useOrderItems";
import { type ScanSounds, useScanSounds } from "@/hooks/useScanSounds";
import type { Order, OrderItem } from "@/model/Order";
import { formatOrderDate } from "@/services/OrderDate";
import { type ReceiptBanner, receiptBanner } from "@/services/ReceiptBanner";
import { createReceiptDraft } from "@/services/ReceiptDraft";
import ReceiptRecognizer from "@/services/ReceiptRecognizer";
import { createReceiptScan } from "@/services/ReceiptScan";
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
  if (items) {
    return <ReceiptSession order={order} items={items} onLeave={leave} onAccountChanged={goToList} />;
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
  onLeave: () => void;
  onAccountChanged: () => void;
};

function createSession(
  items: readonly OrderItem[],
  sounds: ScanSounds,
  onBanner: (banner: ReceiptBanner) => void,
  onAccountChanged: () => void,
) {
  const draft = createReceiptDraft(items);
  const scan = createReceiptScan({
    draft,
    recognize: (code, group, apply) => ReceiptRecognizer.recognize(code, group, apply),
    onRecognized: (recognition) => {
      onBanner(receiptBanner(recognition, draft.lines()));
      // The second code of a box only completes the unit the first one counted.
      if (recognition.kind === "added" && recognition.merged) {
        return;
      }
      Vibration.vibrate(100);
      if (recognition.kind === "added") {
        sounds.success();
      } else {
        sounds.error();
      }
    },
    onAccountChanged,
  });
  return { draft, scan };
}

function ReceiptSession({ order, items, onLeave, onAccountChanged }: ReceiptSessionProps) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { cameraTurn } = useScanCamera();
  const sounds = useScanSounds();
  const [banner, setBanner] = useState<ReceiptBanner | null>(null);
  const [{ draft, scan }] = useState(() => createSession(items, sounds, setBanner, onAccountChanged));

  useEffect(() => () => scan.close(), [scan]);

  const lines = draft.lines();
  const scanned = draft.count();
  const finished = finishedAtStartCount(lines);

  return (
    <ReceiptLayout
      order={order}
      onLeave={onLeave}
      camera={
        cameraTurn.receipt && isFocused ? <ReceiptCamera onScanned={({ data }) => scan.frame(data, Date.now())} /> : null
      }
      banner={banner}
      header={
        <>
          <Text style={styles.sheetTitle}>
            {scanned} {scanned > 1 ? "produits scannés" : "produit scanné"}
          </Text>
          {finished > 0 ? (
            <Text style={styles.sheetNote}>
              {finished} {finished > 1 ? "lignes déjà terminées" : "ligne déjà terminée"}
            </Text>
          ) : null}
        </>
      }
    >
      <FlatList
        data={lines}
        keyExtractor={(line) => String(line.item.orderItemId)}
        renderItem={({ item }) => <ReceiptLineRow line={item} />}
        contentContainerStyle={{ paddingBottom: 16 + insets.bottom }}
      />
    </ReceiptLayout>
  );
}

type ReceiptLayoutProps = {
  order: Order;
  onLeave: () => void;
  camera?: ReactNode;
  banner?: ReceiptBanner | null;
  header: ReactNode;
  children: ReactNode;
};

function ReceiptLayout({ order, onLeave, camera, banner, header, children }: ReceiptLayoutProps) {
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
        {banner ? <ReceiptScanCard banner={banner} style={styles.banner} /> : null}
      </View>
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>{header}</View>
        {children}
      </View>
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
  sheetNote: {
    color: colors.MUTED,
    fontSize: 12,
    fontFamily: "Montserrat",
  },
});
