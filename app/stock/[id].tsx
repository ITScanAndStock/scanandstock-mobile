import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import CartIcon from "@/assets/images/figma/cart.svg";
import ChevronLeft from "@/assets/images/figma/chevron-left.svg";
import EditIcon from "@/assets/images/figma/edit.svg";
import { colors } from "@/constants/colors";
import { getStockProduitById } from "@/data/mockStock";
import { formatPurchasePrice, getActiveLots, getUsedLots, StockLot } from "@/model/StockProduit";

type LotTab = "stock" | "used";

const TAB_PADDING = 2;
const TAB_GAP = 4;

function formatExpiryDisplay(lot: StockLot): string {
  const date = new Date(lot.expiresAt);
  const formatted = Number.isNaN(date.getTime())
    ? lot.expiresAt
    : `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  if (lot.expiresHint) {
    return `Périme le ${formatted} · ${lot.expiresHint}`;
  }
  return `Périme le ${formatted}`;
}

export default function StockProduitFiche() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const produitId = Array.isArray(id) ? id[0] : id;
  const produit = getStockProduitById(produitId ?? "");
  const [quantity, setQuantity] = useState(produit?.quantity ?? 0);
  const [tab, setTab] = useState<LotTab>("stock");
  const [tabWidth, setTabWidth] = useState(0);
  const [editingQty, setEditingQty] = useState(false);
  const [qtyDraft, setQtyDraft] = useState("");
  const qtyInputRef = useRef<TextInput>(null);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const lotsOpacity = useRef(new Animated.Value(1)).current;

  const activeLots = useMemo(() => (produit ? getActiveLots(produit) : []), [produit]);
  const usedLots = useMemo(() => (produit ? getUsedLots(produit) : []), [produit]);
  const visibleLots = tab === "stock" ? activeLots : usedLots;
  const below = produit ? quantity < produit.threshold : false;

  const optionWidth =
    tabWidth > 0 ? (tabWidth - TAB_PADDING * 2 - TAB_GAP) / 2 : 0;

  useEffect(() => {
    if (optionWidth <= 0) {
      return;
    }
    const toValue = tab === "stock" ? 0 : optionWidth + TAB_GAP;
    Animated.spring(indicatorX, {
      toValue,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
  }, [tab, optionWidth, indicatorX]);

  const handleTabsLayout = (event: LayoutChangeEvent) => {
    setTabWidth(event.nativeEvent.layout.width);
  };

  const selectTab = (next: LotTab) => {
    if (next === tab) {
      return;
    }
    Animated.sequence([
      Animated.timing(lotsOpacity, {
        toValue: 0.35,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(lotsOpacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
    setTab(next);
  };

  useEffect(() => {
    if (editingQty) {
      const id = setTimeout(() => qtyInputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [editingQty]);

  const openQtyInput = () => {
    setQtyDraft("");
    setEditingQty(true);
  };

  const commitQtyInput = () => {
    const parsed = Number.parseInt(qtyDraft, 10);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      setQuantity(parsed);
    }
    setEditingQty(false);
    setQtyDraft("");
  };

  if (!produit) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Produit introuvable</Text>
        <Pressable onPress={() => router.back()} style={styles.missingBack}>
          <Text style={styles.missingBackText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const meta = `${produit.supplier}${produit.reference ? ` · réf. ${produit.reference}` : ""}`;

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <View style={styles.titleRow}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => router.back()}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Retour au stock"
          >
            <ChevronLeft width={20} height={20} accessible={false} />
          </Pressable>
          <View style={styles.titleCol}>
            <Text style={styles.title}>{produit.designation}</Text>
            <Text style={styles.meta}>{meta}</Text>
          </View>
          <Pressable
            style={styles.iconBtn}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Modifier le produit"
          >
            <EditIcon width={20} height={20} accessible={false} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.stockCard}>
          {/* Same width as “Saisir une quantité” so ± line up with that button. */}
          <View style={styles.stockControls}>
            <View style={styles.stockRow}>
              <Pressable
                style={styles.minusBtn}
                onPress={() => setQuantity((q) => Math.max(0, q - 1))}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Retirer un du stock"
              >
                <Text style={styles.minusLabel}>−</Text>
              </Pressable>
              <View style={styles.stockCenter}>
                <Text style={styles.stockLabel}>En stock</Text>
                {editingQty ? (
                  <TextInput
                    ref={qtyInputRef}
                    style={[styles.stockQty, styles.stockQtyInput, below && styles.stockQtyAlert]}
                    value={qtyDraft}
                    onChangeText={(text) => setQtyDraft(text.replace(/[^0-9]/g, ""))}
                    onBlur={commitQtyInput}
                    onSubmitEditing={commitQtyInput}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    placeholder="0"
                    placeholderTextColor={colors.MUTED}
                    selectTextOnFocus
                    accessible={true}
                    accessibilityLabel="Quantité en stock"
                  />
                ) : (
                  <Text style={[styles.stockQty, below && styles.stockQtyAlert]}>{quantity}</Text>
                )}
              </View>
              <Pressable
                style={styles.plusBtn}
                onPress={() => setQuantity((q) => q + 1)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Ajouter un au stock"
              >
                <Text style={styles.plusLabel}>+</Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.qtyInputBtn}
              onPress={openQtyInput}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Saisir une quantité"
            >
              <Text style={styles.qtyInputLabel}>Saisir une quantité</Text>
            </Pressable>
          </View>

          <View style={styles.badges}>
            {below ? (
              <View style={styles.badgeThreshold}>
                <Text style={styles.badgeThresholdText}>Sous le seuil ({produit.threshold})</Text>
              </View>
            ) : null}
            {(produit.orderedQty ?? 0) > 0 ? (
              <View style={styles.badgeOrdered}>
                <Text style={styles.badgeOrderedText}>{produit.orderedQty} commandés</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Seuil d&apos;alerte</Text>
            <Text style={styles.statValue}>{produit.threshold}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Stock idéal</Text>
            <Text style={styles.statValue}>{produit.idealStock ?? "—"}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Par boîte</Text>
            <Text style={styles.statValue}>{produit.perBox ?? "—"}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Prix d&apos;achat</Text>
            <Text style={styles.statValue}>
              {produit.purchasePrice != null ? formatPurchasePrice(produit.purchasePrice, produit.currency) : "—"}
            </Text>
          </View>
          <View style={[styles.statCard, styles.statCardWide]}>
            <Text style={styles.statLabel}>Catégorie</Text>
            <Text style={styles.statValue}>{produit.category}</Text>
          </View>
        </View>

        <View
          style={styles.tabs}
          onLayout={handleTabsLayout}
          accessible={true}
          accessibilityRole="tablist"
          accessibilityLabel="Lots du produit"
        >
          {optionWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.tabIndicator,
                {
                  width: optionWidth,
                  transform: [{ translateX: indicatorX }],
                },
              ]}
            />
          ) : null}
          <Pressable
            style={styles.tab}
            onPress={() => selectTab("stock")}
            accessible={true}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === "stock" }}
            accessibilityLabel={`Lots en stock, ${activeLots.length}`}
          >
            <Text style={[styles.tabLabel, tab === "stock" && styles.tabLabelActive]}>
              Lots en stock · {activeLots.length}
            </Text>
          </Pressable>
          <Pressable
            style={styles.tab}
            onPress={() => selectTab("used")}
            accessible={true}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === "used" }}
            accessibilityLabel="Lots utilisés"
          >
            <Text style={[styles.tabLabel, tab === "used" && styles.tabLabelActive]}>
              Lots utilisés
            </Text>
          </Pressable>
        </View>

        <Animated.View style={[styles.lotsBlock, { opacity: lotsOpacity }]}>
          {visibleLots.length === 0 ? (
            <Text style={styles.emptyLots}>Aucun lot</Text>
          ) : (
            visibleLots.map((lot) => (
              <View key={lot.id} style={[styles.lotCard, lot.expiringSoon && styles.lotCardAlert]}>
                <View style={styles.lotText}>
                  <Text style={styles.lotTitle}>Lot {lot.lotNumber}</Text>
                  <Text style={[styles.lotExpiry, lot.expiringSoon && styles.lotExpiryAlert]}>
                    {formatExpiryDisplay(lot)}
                  </Text>
                </View>
                <Text style={styles.lotQty}>{lot.quantity}</Text>
              </View>
            ))
          )}

          {tab === "stock" ? (
            <Pressable
              style={styles.addLotBtn}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Ajouter un lot, scan ou saisie"
            >
              <Text style={styles.addLotLabel}>+ Ajouter un lot (scan ou saisie)</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.cartBtn}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Ajouter au panier"
        >
          <CartIcon width={20} height={20} accessible={false} />
          <Text style={styles.cartLabel}>Ajouter au panier</Text>
        </Pressable>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.SURFACE,
  },
  headerBlock: {
    backgroundColor: colors.DARK,
    // Match Header logout inset (paddingHorizontal: 20) so edit lines up.
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.PILL,
    alignItems: "center",
    justifyContent: "center",
  },
  titleCol: {
    flex: 1,
    paddingTop: 2,
    minWidth: 0,
  },
  title: {
    color: colors.WHITE,
    fontSize: 18,
    lineHeight: 22.5,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  meta: {
    marginTop: 4,
    color: colors.WHITE,
    opacity: 0.85,
    fontSize: 12,
    fontFamily: "Montserrat",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 12,
  },
  stockCard: {
    backgroundColor: colors.WHITE,
    borderWidth: 1,
    borderColor: colors.CARD_BORDER,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 12,
    alignItems: "center",
  },
  stockControls: {
    width: "100%",
    maxWidth: 240,
    gap: 12,
  },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  minusBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EEF1F2",
    alignItems: "center",
    justifyContent: "center",
  },
  minusLabel: {
    color: colors.DARK,
    fontSize: 26,
    fontFamily: "SemiBold",
    fontWeight: "700",
  },
  plusBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EEF1F2",
    alignItems: "center",
    justifyContent: "center",
  },
  plusLabel: {
    color: colors.DARK,
    fontSize: 26,
    fontFamily: "SemiBold",
    fontWeight: "700",
  },
  stockCenter: {
    flex: 1,
    alignItems: "center",
  },
  stockLabel: {
    color: colors.MUTED,
    fontSize: 12,
    fontFamily: "SemiBold",
    fontWeight: "600",
  },
  stockQty: {
    color: colors.DARK,
    fontSize: 40,
    lineHeight: 44,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  stockQtyAlert: {
    color: colors.DECREASE_TEXT,
  },
  stockQtyInput: {
    minWidth: 80,
    padding: 0,
    textAlign: "center",
  },
  qtyInputBtn: {
    width: "100%",
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EEF1F2",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyInputLabel: {
    color: colors.DARK,
    fontSize: 14,
    fontFamily: "SemiBold",
    fontWeight: "700",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },
  badgeThreshold: {
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 10,
    backgroundColor: colors.STATUS_PARTIELLE_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeThresholdText: {
    color: colors.STATUS_PARTIELLE_TEXT,
    fontSize: 12,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  badgeOrdered: {
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 10,
    backgroundColor: colors.INCREASE_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeOrderedText: {
    color: colors.INCREASE_TEXT,
    fontSize: 12,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statCard: {
    width: "31.5%",
    flexGrow: 1,
    backgroundColor: colors.WHITE,
    borderWidth: 1,
    borderColor: colors.CARD_BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 52,
  },
  statCardWide: {
    width: "64%",
    flexGrow: 2,
  },
  statLabel: {
    color: colors.MUTED,
    fontSize: 11,
    fontFamily: "SemiBold",
    fontWeight: "600",
  },
  statValue: {
    marginTop: 2,
    color: colors.DARK,
    fontSize: 14,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  tabs: {
    flexDirection: "row",
    gap: TAB_GAP,
    backgroundColor: "#E6EAEC",
    borderRadius: 22,
    padding: TAB_PADDING,
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    top: TAB_PADDING,
    left: TAB_PADDING,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.DARK,
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    zIndex: 1,
  },
  tabLabel: {
    color: colors.DARK,
    fontSize: 13,
    fontFamily: "SemiBold",
    fontWeight: "700",
    textAlign: "center",
  },
  tabLabelActive: {
    color: colors.WHITE,
    fontWeight: "800",
  },
  lotsBlock: {
    gap: 12,
  },
  lotCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.WHITE,
    borderWidth: 1,
    borderColor: colors.CARD_BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  lotCardAlert: {
    borderColor: "#F0C9A8",
  },
  lotText: {
    flex: 1,
    minWidth: 0,
  },
  lotTitle: {
    color: colors.DARK,
    fontSize: 14,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  lotExpiry: {
    marginTop: 2,
    color: colors.MUTED,
    fontSize: 12,
    fontFamily: "SemiBold",
    fontWeight: "600",
  },
  lotExpiryAlert: {
    color: colors.DECREASE_TEXT,
  },
  lotQty: {
    color: colors.DARK,
    fontSize: 15,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  addLotBtn: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#9AA6AD",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.WHITE,
  },
  addLotLabel: {
    color: colors.DARK,
    fontSize: 13,
    fontFamily: "SemiBold",
    fontWeight: "700",
  },
  emptyLots: {
    textAlign: "center",
    color: colors.MUTED,
    fontSize: 13,
    fontFamily: "Montserrat",
    paddingVertical: 12,
  },
  footer: {
    backgroundColor: colors.WHITE,
    borderTopWidth: 1,
    borderTopColor: colors.TAB_BORDER,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  cartBtn: {
    height: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.GREEN_DARK,
    backgroundColor: colors.WHITE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  cartLabel: {
    color: colors.GREEN_DARK,
    fontSize: 15,
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
});
