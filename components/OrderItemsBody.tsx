import { FlatList, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { colors } from "../constants/colors";
import type { OrderItem } from "../model/Order";
import { receivedRatio, remainingQuantity } from "../services/OrderProgress";
import { LoadFailed, Loading, styles as loadStyles } from "./LoadState";

function describeLine(item: OrderItem) {
  const remaining = remainingQuantity(item);
  const finished = remaining === 0;
  const receivers = item.receivers?.length ? `reçu par ${item.receivers.join(", ")}` : null;
  const note = [finished ? "Terminée" : `Reste ${remaining}`, receivers].filter(Boolean).join(" · ");
  const quantities = `${item.itemDeliveredQuantity} / ${item.itemQuantity}`;
  return { finished, note, quantities, label: `${item.itemDesignation}, reçu ${quantities}, ${note}` };
}

function ProgressBar({ item, finished }: { item: OrderItem; finished: boolean }) {
  return (
    <View style={styles.bar}>
      <View
        style={[
          styles.barFill,
          { width: `${receivedRatio(item) * 100}%`, backgroundColor: finished ? colors.MUTED : colors.GREEN_DARK },
        ]}
      />
    </View>
  );
}

function OrderLine({ item }: { item: OrderItem }) {
  const { finished, note, quantities, label } = describeLine(item);

  return (
    <View style={styles.line} accessible={true} accessibilityLabel={label}>
      <View style={styles.lineTop}>
        <Text style={styles.designation} numberOfLines={1} ellipsizeMode="tail">
          {item.itemDesignation}
        </Text>
        <Text style={styles.quantities}>{quantities}</Text>
      </View>
      <Text style={styles.note}>{note}</Text>
      <View style={styles.lineBar}>
        <ProgressBar item={item} finished={finished} />
      </View>
    </View>
  );
}

function OrderLineTableHeader() {
  return (
    <View
      style={[styles.row, styles.headerRow]}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={[styles.headerText, styles.product]}>Produit</Text>
      <Text style={[styles.headerText, styles.number]}>Commandé</Text>
      <Text style={[styles.headerText, styles.number]}>Reçu</Text>
      <Text style={[styles.headerText, styles.progress]}>Avancement</Text>
    </View>
  );
}

function OrderLineRow({ item }: { item: OrderItem }) {
  const { finished, note, label } = describeLine(item);

  return (
    <View style={[styles.row, styles.bodyRow]} accessible={true} accessibilityLabel={label}>
      <View style={styles.product}>
        <Text style={styles.designation} numberOfLines={1} ellipsizeMode="tail">
          {item.itemDesignation}
        </Text>
        <Text style={styles.note} numberOfLines={1} ellipsizeMode="tail">
          {note}
        </Text>
      </View>
      <Text style={[styles.cell, styles.number]}>{item.itemQuantity}</Text>
      <Text style={[styles.cell, styles.number, styles.received]}>{item.itemDeliveredQuantity}</Text>
      <View style={styles.progress}>
        <ProgressBar item={item} finished={finished} />
      </View>
    </View>
  );
}

type OrderItemsBodyProps = {
  items: OrderItem[] | undefined;
  failed: boolean;
  onRetry: () => void;
  tableLayout: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export default function OrderItemsBody({ items, failed, onRetry, tableLayout, contentContainerStyle }: OrderItemsBodyProps) {
  if (failed) {
    return <LoadFailed message="Impossible de charger la commande" onRetry={onRetry} />;
  }
  if (!items) {
    return <Loading label="Chargement de la commande" />;
  }
  if (items.length === 0) {
    return (
      <View style={loadStyles.center}>
        <Text style={loadStyles.message}>Aucune ligne dans cette commande</Text>
      </View>
    );
  }
  if (tableLayout) {
    return (
      <View style={styles.table}>
        <OrderLineTableHeader />
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.orderItemId)}
          renderItem={({ item }) => <OrderLineRow item={item} />}
        />
      </View>
    );
  }
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.orderItemId)}
      renderItem={({ item }) => <OrderLine item={item} />}
      ItemSeparatorComponent={Separator}
      contentContainerStyle={contentContainerStyle}
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  table: {
    flexShrink: 1,
    backgroundColor: colors.WHITE,
    borderWidth: 1,
    borderColor: colors.TAB_BAR_BORDER,
    borderRadius: 16,
    overflow: "hidden",
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
  lineBar: {
    marginTop: 10,
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
  note: {
    marginTop: 3,
    color: colors.MUTED,
    fontSize: 12,
    fontFamily: "Montserrat",
  },
  bar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.PROGRESS_TRACK,
    overflow: "hidden",
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
  },
  headerRow: {
    height: 42,
    backgroundColor: colors.TABLE_HEADER_BG,
  },
  bodyRow: {
    minHeight: 60,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.BORDER,
  },
  headerText: {
    color: colors.MUTED,
    fontSize: 12,
    fontFamily: "SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  product: {
    flex: 1,
    minWidth: 0,
  },
  number: {
    width: 90,
  },
  progress: {
    width: 170,
  },
  cell: {
    color: colors.DARK,
    fontSize: 14,
    fontFamily: "Montserrat",
  },
  received: {
    fontFamily: "SemiBold",
  },
});
