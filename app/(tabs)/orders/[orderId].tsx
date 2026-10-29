import { useCallback, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import ChevronBack from "../../../assets/images/figma/chevron-back.svg";
import Header from "../../../components/Header";
import { formatPrice, OrderStatusPill, providerNames } from "../../../components/OrderCard";
import OrderItemsBody from "../../../components/OrderItemsBody";
import ReceptionNote from "../../../components/ReceptionNote";
import { useScreenLeftInset } from "../../../components/SideRail";
import { useScreenBottomInset } from "../../../components/TabBar";
import { colors } from "@/constants/colors";
import { isTablet } from "@/constants/layout";
import { useAccount } from "@/context/AccountContext";
import { useOrderItems } from "@/hooks/useOrderItems";
import { formatOrderDate } from "@/services/OrderDate";
import { orderProgress } from "@/services/OrderProgress";
import OrderCache from "@/state/OrderCache";

const TABLET_GUTTER = 28;

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
  const { items, failed, retry } = useOrderItems(accountId, order);

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

  if (!order) {
    return <View style={styles.container} />;
  }

  const progress = items ? orderProgress(items) : null;
  const summary = [providerNames(order), formatPrice(order.orderPrice)].filter(Boolean).join(" · ");

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
      <OrderItemsBody items={items} failed={failed} onRetry={retry} tableLayout={false} contentContainerStyle={styles.list} />
      <ReceptionNote order={order} style={styles.footer} />
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
  footer: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.WHITE,
    borderTopWidth: 1,
    borderTopColor: colors.TAB_BAR_BORDER,
  },
});
