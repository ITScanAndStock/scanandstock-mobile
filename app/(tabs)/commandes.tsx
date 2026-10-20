import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, FlatList, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import ChoosAccount from "@/components/ChooseAccount";
import CommandeListItem from "@/components/ui-components/CommandeListItem";
import { colors } from "@/constants/colors";
import { MOCK_COMMANDES } from "@/data/mockCommandes";
import { CommandeFilter } from "@/model/Commande";

const SEGMENT_PADDING = 2;
const SEGMENT_GAP = 2;

export default function Commandes() {
  const [filter, setFilter] = useState<CommandeFilter>("a_receptionner");
  const [segmentWidth, setSegmentWidth] = useState(0);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const listOpacity = useRef(new Animated.Value(1)).current;

  const toReceiveCount = useMemo(
    () => MOCK_COMMANDES.filter((c) => c.awaitingReception).length,
    [],
  );

  const visibleCommandes = useMemo(() => {
    if (filter === "a_receptionner") {
      return MOCK_COMMANDES.filter((c) => c.awaitingReception);
    }
    return MOCK_COMMANDES;
  }, [filter]);

  const optionWidth =
    segmentWidth > 0 ? (segmentWidth - SEGMENT_PADDING * 2 - SEGMENT_GAP) / 2 : 0;

  useEffect(() => {
    if (optionWidth <= 0) {
      return;
    }
    const toValue = filter === "a_receptionner" ? 0 : optionWidth + SEGMENT_GAP;
    Animated.spring(indicatorX, {
      toValue,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
  }, [filter, optionWidth, indicatorX]);

  const handleSegmentLayout = (event: LayoutChangeEvent) => {
    setSegmentWidth(event.nativeEvent.layout.width);
  };

  const selectFilter = (next: CommandeFilter) => {
    if (next === filter) {
      return;
    }
    Animated.sequence([
      Animated.timing(listOpacity, {
        toValue: 0.35,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(listOpacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
    setFilter(next);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Commandes</Text>
          <ChoosAccount compact />
        </View>

        <View
          style={styles.segment}
          onLayout={handleSegmentLayout}
          accessible={true}
          accessibilityRole="tablist"
          accessibilityLabel="Filtrer les commandes"
        >
          {optionWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.segmentIndicator,
                {
                  width: optionWidth,
                  transform: [{ translateX: indicatorX }],
                },
              ]}
            />
          ) : null}

          <Pressable
            style={styles.segmentOption}
            onPress={() => selectFilter("a_receptionner")}
            accessible={true}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === "a_receptionner" }}
            accessibilityLabel={`À réceptionner, ${toReceiveCount}`}
          >
            <Text
              style={[styles.segmentLabel, filter === "a_receptionner" && styles.segmentLabelActive]}
            >
              {`À réceptionner · ${toReceiveCount}`}
            </Text>
          </Pressable>
          <Pressable
            style={styles.segmentOption}
            onPress={() => selectFilter("toutes")}
            accessible={true}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === "toutes" }}
            accessibilityLabel="Toutes"
          >
            <Text style={[styles.segmentLabel, filter === "toutes" && styles.segmentLabelActive]}>
              Toutes
            </Text>
          </Pressable>
        </View>
      </View>

      <Animated.View style={[styles.list, { opacity: listOpacity }]}>
        <FlatList
          data={visibleCommandes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          style={styles.list}
          renderItem={({ item }) => (
            <CommandeListItem
              item={item}
              onPress={(commande) => router.push(`/commandes/${commande.id}`)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Aucune commande pour ce filtre</Text>
          }
        />
      </Animated.View>
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 14,
    zIndex: 10,
    overflow: "visible",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    zIndex: 10,
    overflow: "visible",
  },
  title: {
    color: colors.WHITE,
    fontSize: 24,
    fontFamily: "SemiBold",
    fontWeight: "800",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.PILL,
    borderRadius: 22,
    padding: SEGMENT_PADDING,
    gap: SEGMENT_GAP,
    position: "relative",
  },
  segmentIndicator: {
    position: "absolute",
    top: SEGMENT_PADDING,
    left: SEGMENT_PADDING,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.WHITE,
  },
  segmentOption: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    zIndex: 1,
  },
  segmentLabel: {
    color: colors.WHITE,
    fontSize: 14,
    fontFamily: "SemiBold",
    fontWeight: "600",
    textAlign: "center",
  },
  segmentLabelActive: {
    color: colors.DARK,
    fontWeight: "800",
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  separator: {
    height: 12,
  },
  emptyText: {
    marginTop: 32,
    textAlign: "center",
    color: colors.MUTED,
    fontSize: 14,
    fontFamily: "Montserrat",
  },
});
