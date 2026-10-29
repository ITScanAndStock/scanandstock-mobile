import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";

import Header from "../../../components/Header";
import { LoadFailed, Loading, styles as loadStyles } from "../../../components/LoadState";
import OrderCard from "../../../components/OrderCard";
import { useScreenLeftInset } from "../../../components/SideRail";
import { useScreenBottomInset } from "../../../components/TabBar";
import { colors } from "@/constants/colors";
import { isTablet } from "@/constants/layout";
import { useAccount } from "@/context/AccountContext";
import { type OrderListFilter, useOrderList } from "@/hooks/useOrderList";

const TABLET_GUTTER = 28;

const EMPTY_MESSAGES: Record<OrderListFilter, string> = {
  toReceive: "Aucune commande à réceptionner",
  all: "Aucune commande",
};

export default function Orders() {
  const tablet = isTablet();
  const bottomInset = useScreenBottomInset();
  const leftInset = useScreenLeftInset();
  const navigation = useNavigation();
  const router = useRouter();
  const { activeAccount } = useAccount();
  const accountId = activeAccount?.id;
  const [filter, setFilter] = useState<OrderListFilter>("toReceive");
  const { toReceive, all, failed, loadingMore, loadMore, retry } = useOrderList(accountId);

  // A key on the Stack would not do: React Navigation rebuilds a remounted navigator from the parent route's state.
  useEffect(() => {
    if ((navigation.getState()?.index ?? 0) > 0) {
      navigation.dispatch({ type: "POP_TO_TOP" });
    }
  }, [accountId, navigation]);

  const orders = filter === "toReceive" ? toReceive?.orders : all?.orders;
  const toReceiveLabel = toReceive ? `À réceptionner (${toReceive.count})` : "À réceptionner";

  const filters = (
    <View style={[styles.segment, tablet && styles.segmentTablet]} accessibilityRole="radiogroup" accessibilityLabel="Filtrer les commandes">
      {(
        [
          ["toReceive", toReceiveLabel],
          ["all", "Toutes"],
        ] as const
      ).map(([key, label]) => {
        const selected = filter === key;
        return (
          <Pressable
            key={key}
            style={[styles.segmentButton, !tablet && styles.segmentButtonPhone, selected && styles.segmentButtonSelected]}
            onPress={() => setFilter(key)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  let body;
  if (failed && !orders) {
    body = <LoadFailed message="Impossible de charger les commandes" onRetry={retry} />;
  } else if (!orders) {
    body = <Loading label="Chargement des commandes" />;
  } else {
    body = (
      <FlatList
        data={orders}
        keyExtractor={(order) => String(order.orderId)}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => router.push({ pathname: "/orders/[orderId]", params: { orderId: String(item.orderId) } })}
          />
        )}
        contentContainerStyle={[styles.list, tablet && styles.listTablet, orders.length === 0 && styles.listEmpty]}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={<Text style={loadStyles.message}>{EMPTY_MESSAGES[filter]}</Text>}
        ListFooterComponent={
          filter === "all" && loadingMore ? <ActivityIndicator style={styles.footer} color={colors.GREEN_DARK} /> : null
        }
        onEndReached={filter === "all" ? loadMore : undefined}
        onEndReachedThreshold={0.5}
      />
    );
  }

  if (tablet) {
    return (
      <View style={[styles.container, styles.tablet, { paddingLeft: leftInset + TABLET_GUTTER, paddingBottom: bottomInset }]}>
        <View style={styles.tabletHeader}>
          <Text style={styles.tabletTitle} accessibilityRole="header">
            Commandes
          </Text>
          {filters}
        </View>
        {body}
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={styles.band}>
        <Header />
        <Text style={styles.title} accessibilityRole="header">
          Commandes
        </Text>
        {filters}
      </View>
      {body}
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
  tablet: {
    paddingTop: 26,
    paddingRight: TABLET_GUTTER,
  },
  band: {
    backgroundColor: colors.DARK,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 14,
  },
  title: {
    color: colors.WHITE,
    fontSize: 24,
    fontFamily: "SemiBold",
  },
  tabletHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  tabletTitle: {
    color: colors.DARK,
    fontSize: 26,
    fontFamily: "SemiBold",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.PILL,
    borderRadius: 22,
    padding: 2,
    gap: 2,
  },
  segmentTablet: {
    backgroundColor: colors.DARK,
  },
  segmentButton: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentButtonPhone: {
    flex: 1,
  },
  segmentButtonSelected: {
    backgroundColor: colors.WHITE,
  },
  segmentText: {
    color: colors.WHITE,
    fontSize: 14,
    fontFamily: "Medium",
  },
  segmentTextSelected: {
    color: colors.DARK,
    fontFamily: "SemiBold",
  },
  list: {
    padding: 16,
  },
  listTablet: {
    paddingHorizontal: 0,
    paddingTop: 24,
    maxWidth: 360,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  separator: {
    height: 12,
  },
  footer: {
    paddingVertical: 16,
  },
});
