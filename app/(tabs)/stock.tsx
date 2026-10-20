import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";

import ChevronDownSm from "@/assets/images/figma/chevron-down-sm.svg";
import PlusIcon from "@/assets/images/figma/plus.svg";
import SearchIcon from "@/assets/images/figma/search.svg";
import StockListItem from "@/components/ui-components/StockListItem";
import { colors } from "@/constants/colors";
import { MOCK_STOCK } from "@/data/mockStock";
import { isBelowThreshold } from "@/model/StockProduit";

export default function Stock() {
  const [query, setQuery] = useState("");
  // Figma shows the full list with below-threshold items first; chip toggles the filter.
  const [belowOnly, setBelowOnly] = useState(false);

  const belowCount = useMemo(
    () => MOCK_STOCK.filter(isBelowThreshold).length,
    [],
  );

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return MOCK_STOCK.filter((item) => {
      if (belowOnly && !isBelowThreshold(item)) {
        return false;
      }
      if (!normalized) {
        return true;
      }
      return (
        item.designation.toLowerCase().includes(normalized) ||
        item.supplier.toLowerCase().includes(normalized) ||
        item.category.toLowerCase().includes(normalized)
      );
    }).sort((a, b) => Number(isBelowThreshold(b)) - Number(isBelowThreshold(a)));
  }, [belowOnly, query]);

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Stock</Text>
          <Pressable
            style={styles.addBtn}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Ajouter un produit"
          >
            <PlusIcon width={16} height={16} accessible={false} />
            <Text style={styles.addBtnLabel}>Produit</Text>
          </Pressable>
        </View>

        <View style={styles.search}>
          <SearchIcon width={18} height={18} accessible={false} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un produit, une référence"
            placeholderTextColor="#757575"
            accessible={true}
            accessibilityLabel="Rechercher un produit, une référence"
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.filters}>
          <Pressable
            style={[styles.filterChip, belowCount > 0 && styles.filterChipActive]}
            onPress={() => setBelowOnly((prev) => !prev)}
            accessible={true}
            accessibilityRole="button"
            accessibilityState={{ selected: belowOnly }}
            accessibilityLabel={`Sous le seuil, ${belowCount}${
              belowOnly ? ", filtre actif" : ""
            }`}
          >
            <Text
              style={[
                styles.filterChipLabel,
                belowCount > 0 && styles.filterChipLabelActive,
              ]}
            >
              Sous le seuil · {belowCount}
            </Text>
          </Pressable>

          <Pressable
            style={styles.filterChipOutline}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Filtrer par catégorie"
          >
            <Text style={styles.filterChipOutlineLabel}>Catégorie</Text>
            <ChevronDownSm width={14} height={14} accessible={false} />
          </Pressable>

          <Pressable
            style={styles.filterChipOutline}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Filtrer par fournisseur"
          >
            <Text style={styles.filterChipOutlineLabel}>Fournisseur</Text>
            <ChevronDownSm width={14} height={14} accessible={false} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <StockListItem
            item={item}
            onPress={(produit) => router.push(`/stock/${produit.id}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aucun produit pour ce filtre</Text>
        }
        keyboardShouldPersistTaps="handled"
      />
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
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 4,
  },
  title: {
    color: colors.WHITE,
    fontSize: 24,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.GREEN_DARK,
  },
  addBtnLabel: {
    color: colors.WHITE,
    fontSize: 13,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.WHITE,
  },
  searchInput: {
    flex: 1,
    color: colors.DARK,
    fontSize: 14,
    fontFamily: "Montserrat",
    paddingVertical: 0,
  },
  filters: {
    flexDirection: "row",
    gap: 6,
  },
  filterChip: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: "#F5C26B",
    borderColor: "#F5C26B",
  },
  filterChipLabel: {
    color: colors.WHITE,
    fontSize: 12,
    fontFamily: "SemiBold",
    fontWeight: "700",
  },
  filterChipLabelActive: {
    color: "#3A2A07",
  },
  filterChipOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  filterChipOutlineLabel: {
    color: colors.WHITE,
    fontSize: 12,
    fontFamily: "SemiBold",
    fontWeight: "700",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    flexGrow: 1,
  },
  separator: {
    height: 10,
  },
  emptyText: {
    marginTop: 32,
    textAlign: "center",
    color: colors.MUTED,
    fontSize: 14,
    fontFamily: "Montserrat",
  },
});
