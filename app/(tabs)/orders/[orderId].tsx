import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import ChevronBack from "../../../assets/images/figma/chevron-back.svg";
import Header from "../../../components/Header";
import { LoadFailed, Loading, styles as loadStyles } from "../../../components/LoadState";
import { formatPrice, OrderStatusPill, providerNames } from "../../../components/OrderCard";
import { useScreenLeftInset } from "../../../components/SideRail";
import { useScreenBottomInset } from "../../../components/TabBar";
import { colors } from "@/constants/colors";
import { isTablet } from "@/constants/layout";
import { useAccount } from "@/context/AccountContext";
import type { OrderItem } from "@/model/Order";
import { canReceiveOrders } from "@/services/AccessToken";
import { formatOrderDate } from "@/services/OrderDate";
import { orderProgress, receivedRatio, remainingQuantity } from "@/services/OrderProgress";
import OrderService, { AccountChangedError } from "@/services/OrderService";
import SecureStorageService from "@/services/SecureStorageService";
import OrderCache from "@/state/OrderCache";

const TABLET_GUTTER = 28;

type ItemsState = { items?: OrderItem[]; failed: boolean };

export default function OrderDetail() {
  const tablet = isTablet();
  const bottomInset = useScreenBottomInset();
  const leftInset = useScreenLeftInset();
  const navigation = useNavigation();
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { activeAccount } = useAccount();
  const accountId = activeAccount?.id;
  const order = accountId ? OrderCache.get(accountId, Number(orderId)) : undefined;
  const [state, setState] = useState<ItemsState>({ failed: false });
  const [attempt, setAttempt] = useState(0);
  const [canReceive, setCanReceive] = useState<boolean | null>(null);

  const goToList = useCallback(() => {
    if ((navigation.getState()?.index ?? 0) > 0) {
      navigation.dispatch({ type: "POP_TO_TOP" });
    } else {
      router.replace("/orders");
    }
  }, [navigation, router]);

  // Opened without the list (deep link): the header has no source, the API has no route for it.
  useEffect(() => {
    if (accountId && !order) {
      goToList();
    }
  }, [accountId, order, goToList]);

  // Read on every opening: the token is rewritten under "token" at each refresh, so the right follows it offline.
  useEffect(() => {
    let cancelled = false;
    SecureStorageService.getToken().then((token) => {
      if (!cancelled) {
        setCanReceive(canReceiveOrders(token));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!accountId || !order) {
      return;
    }
    let cancelled = false;
    OrderService.getOrderItems(accountId, order.orderId).then(
      (items) => {
        if (!cancelled) {
          setState({ items, failed: false });
        }
      },
      (error) => {
        if (cancelled || error instanceof AccountChangedError) {
          return;
        }
        if (__DEV__) {
          console.error("❌ Erreur lors du chargement du détail de la commande", error);
        }
        setState((previous) => ({ ...previous, failed: true }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [accountId, order, attempt]);

  if (!order) {
    return <View style={styles.container} />;
  }

  const items = state.items;
  const progress = items ? orderProgress(items) : null;
  const summary = [providerNames(order), formatPrice(order.orderPrice)].filter(Boolean).join(" · ");
  const receivable = order.orderStatus === "pending" || order.orderStatus === "partial";

  const retry = () => {
    setState({ failed: false });
    setAttempt((previous) => previous + 1);
  };

  let body;
  if (state.failed && !items) {
    body = <LoadFailed message="Impossible de charger la commande" onRetry={retry} />;
  } else if (!items) {
    body = <Loading label="Chargement de la commande" />;
  } else {
    body = (
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.orderItemId)}
        renderItem={({ item }) => <OrderLine item={item} />}
        contentContainerStyle={[styles.list, items.length === 0 && styles.listEmpty]}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={<Text style={loadStyles.message}>Aucune ligne dans cette commande</Text>}
      />
    );
  }

  return (
    <View style={[styles.container, { paddingLeft: leftInset, paddingBottom: bottomInset }]}>
      <View style={[styles.band, tablet && styles.bandTablet]}>
        {tablet ? null : <Header />}
        <View style={styles.titleRow}>
          <Pressable
            style={styles.back}
            onPress={goToList}
            accessibilityRole="button"
            accessibilityLabel="Retour aux commandes"
          >
            <ChevronBack width={20} height={20} accessible={false} />
          </Pressable>
          <Text
            style={styles.title}
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.7}
          >
            Commande du {formatOrderDate(order.orderDate)}
          </Text>
          <OrderStatusPill order={order} />
        </View>
        {summary || order.user ? (
          <Text style={styles.summary}>
            {[summary, order.user ? `Passée par ${order.user}` : null].filter(Boolean).join("\n")}
          </Text>
        ) : null}
        {progress ? (
          <View style={styles.tiles}>
            <Tile label="Reçus" value={`${progress.received} / ${progress.ordered}`} />
            <Tile label="Lignes terminées" value={`${progress.finishedLines} / ${progress.lines}`} />
          </View>
        ) : null}
      </View>
      {body}
      {receivable && canReceive === false ? (
        <View style={styles.footer}>
          <Text style={styles.note}>La réception est réservée aux personnes habilitées de votre cabinet</Text>
        </View>
      ) : null}
    </View>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile} accessible={true} accessibilityLabel={`${label} : ${value}`}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

function OrderLine({ item }: { item: OrderItem }) {
  const remaining = remainingQuantity(item);
  const finished = remaining === 0;
  const receivers = item.receivers?.length ? `reçu par ${item.receivers.join(", ")}` : null;
  const note = [finished ? "Terminée" : `Reste ${remaining}`, receivers].filter(Boolean).join(" · ");
  const quantities = `${item.itemDeliveredQuantity} / ${item.itemQuantity}`;

  return (
    <View
      style={styles.line}
      accessible={true}
      accessibilityLabel={`${item.itemDesignation}, reçu ${quantities}, ${note}`}
    >
      <View style={styles.lineTop}>
        <Text style={styles.designation} numberOfLines={1} ellipsizeMode="tail">
          {item.itemDesignation}
        </Text>
        <Text style={styles.quantities}>{quantities}</Text>
      </View>
      <Text style={styles.lineNote}>{note}</Text>
      <View style={styles.bar}>
        <View
          style={[
            styles.barFill,
            { width: `${receivedRatio(item) * 100}%`, backgroundColor: finished ? colors.MUTED : colors.GREEN_DARK },
          ]}
        />
      </View>
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.SCREEN_BG,
  },
  band: {
    backgroundColor: colors.DARK,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  bandTablet: {
    paddingTop: 26,
    paddingHorizontal: TABLET_GUTTER,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.PILL,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    color: colors.WHITE,
    fontSize: 20,
    fontFamily: "SemiBold",
  },
  summary: {
    color: colors.WHITE,
    opacity: 0.9,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Montserrat",
  },
  tiles: {
    flexDirection: "row",
    gap: 8,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.PILL,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tileLabel: {
    color: colors.WHITE,
    opacity: 0.8,
    fontSize: 11,
    fontFamily: "Montserrat",
  },
  tileValue: {
    color: colors.WHITE,
    fontSize: 18,
    fontFamily: "SemiBold",
  },
  list: {
    padding: 16,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  separator: {
    height: 10,
  },
  line: {
    backgroundColor: colors.WHITE,
    borderWidth: 1,
    borderColor: colors.OPTION_BORDER,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  lineTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 10,
  },
  designation: {
    flex: 1,
    color: colors.DARK,
    fontSize: 14,
    fontFamily: "SemiBold",
  },
  quantities: {
    color: colors.DARK,
    fontSize: 13,
    fontFamily: "SemiBold",
  },
  lineNote: {
    marginTop: 3,
    color: colors.MUTED,
    fontSize: 12,
    fontFamily: "Montserrat",
  },
  bar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.PROGRESS_TRACK,
    marginTop: 10,
    overflow: "hidden",
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  footer: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.WHITE,
    borderTopWidth: 1,
    borderTopColor: colors.TAB_BAR_BORDER,
  },
  note: {
    color: colors.TEXT_SECONDARY,
    fontSize: 14,
    fontFamily: "Medium",
    textAlign: "center",
  },
});
