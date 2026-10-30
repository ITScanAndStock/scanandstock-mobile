import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { useScreenLeftInset } from "../../../../components/SideRail";
import { useScreenBottomInset } from "../../../../components/TabBar";
import { colors } from "@/constants/colors";
import { useAccount } from "@/context/AccountContext";
import { useGoToOrderList } from "@/hooks/useGoToOrderList";
import { formatOrderDate } from "@/services/OrderDate";
import { plural } from "@/services/Plural";
import OrderCache from "@/state/OrderCache";
import ReceiptResults from "@/state/ReceiptResults";

export default function OrderReceived() {
  const goToList = useGoToOrderList();
  const insets = useSafeAreaInsets();
  const bottomInset = useScreenBottomInset();
  const leftInset = useScreenLeftInset();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { activeAccount } = useAccount();
  const accountId = activeAccount?.id;
  const order = accountId ? OrderCache.get(accountId, Number(orderId)) : undefined;
  const result = accountId ? ReceiptResults.get(accountId, Number(orderId)) : undefined;

  useEffect(() => {
    if (accountId && !result) {
      goToList();
    }
  }, [accountId, result, goToList]);

  if (!result) {
    return <View style={styles.container} />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingLeft: leftInset, paddingBottom: bottomInset }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <View style={styles.check} accessible={false}>
            <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
              <Path d="M5 12l5 5 9-10" stroke={colors.WHITE} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          <Text style={styles.title} accessibilityRole="header">
            Réception enregistrée
          </Text>
          <Text style={styles.subtitle}>
            {plural(result.entered, "produit est entré", "produits sont entrés")} en stock.
          </Text>
        </View>
        <View style={styles.card}>
          {order ? (
            <View style={[styles.row, styles.firstRow]}>
              <Text style={styles.rowText}>Commande du {formatOrderDate(order.orderDate)}</Text>
            </View>
          ) : null}
          {result.received.map((line, index) => (
            <View key={line.orderItemId} style={[styles.row, !order && index === 0 && styles.firstRow]}>
              <View style={styles.rowLabel}>
                <Text style={styles.rowText}>{line.designation}</Text>
                {line.over > 0 ? (
                  <Text style={styles.over}>{plural(line.over, "produit")} au-delà du commandé</Text>
                ) : null}
              </View>
              <Text style={styles.rowValue}>+{line.quantity}</Text>
            </View>
          ))}
          {result.remaining.length === 0 ? (
            <View style={styles.row}>
              <Text style={[styles.rowText, styles.muted]}>Plus rien à recevoir</Text>
            </View>
          ) : (
            <>
              <View style={styles.row}>
                <Text style={[styles.rowText, styles.muted]}>Reste à recevoir</Text>
              </View>
              {result.remaining.map((line) => (
                <View key={line.orderItemId} style={styles.restRow}>
                  <Text style={[styles.rowText, styles.muted, styles.rowLabel]}>{line.designation}</Text>
                  <Text style={[styles.rowValue, styles.muted]}>{line.quantity}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Pressable style={styles.button} onPress={goToList} accessibilityRole="button">
          <Text style={styles.buttonText}>Retour aux commandes</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.SCREEN_BG,
  },
  content: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    gap: 22,
  },
  heading: {
    alignItems: "center",
    gap: 14,
  },
  check: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.GREEN_DARK,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 12,
    borderColor: colors.RAIL_ACTIVE_BG,
  },
  title: {
    marginTop: 12,
    color: colors.DARK,
    fontSize: 22,
    fontFamily: "SemiBold",
    textAlign: "center",
  },
  subtitle: {
    color: colors.TEXT_SECONDARY,
    fontSize: 14,
    fontFamily: "Montserrat",
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.WHITE,
    borderWidth: 1,
    borderColor: colors.OPTION_BORDER,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.BORDER,
  },
  firstRow: {
    borderTopWidth: 0,
  },
  restRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 10,
  },
  rowLabel: {
    flex: 1,
  },
  rowText: {
    color: colors.DARK,
    fontSize: 14,
    fontFamily: "Montserrat",
  },
  rowValue: {
    color: colors.DARK,
    fontSize: 14,
    fontFamily: "SemiBold",
  },
  muted: {
    color: colors.MUTED,
  },
  over: {
    marginTop: 2,
    color: colors.WITHDRAW,
    fontSize: 12,
    fontFamily: "Medium",
  },
  footer: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  button: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.NEUTRAL_LINE,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: colors.DARK,
    fontSize: 15,
    fontFamily: "SemiBold",
  },
});
