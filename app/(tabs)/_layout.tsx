// import expo
import { Tabs } from "expo-router";
import { useMemo } from "react";

// import svg and icons
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { ComponentProps } from "react";

// import constants
import { colors } from "@/constants/colors";
import { MOCK_STOCK } from "@/data/mockStock";
import { isBelowThreshold } from "@/model/StockProduit";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const tabBarLabelStyle = {
  fontSize: 10,
  fontFamily: "Medium",
  fontWeight: "500" as const,
};

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return <MaterialCommunityIcons name={name} size={24} color={focused ? colors.GREEN_DARK : colors.MUTED} />;
}

export default function TabLayout() {
  const belowThresholdCount = useMemo(
    () => MOCK_STOCK.filter(isBelowThreshold).length,
    [],
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.GREEN_DARK,
        tabBarInactiveTintColor: colors.MUTED,
        headerShown: false,
        tabBarStyle: {
          height: 64,
          paddingTop: 8,
          paddingBottom: 4,
          backgroundColor: colors.WHITE,
          borderTopWidth: 1,
          borderTopColor: colors.TAB_BORDER,
        },
        tabBarLabelStyle,
      }}
    >
      <Tabs.Screen
        name="commandes"
        options={{
          title: "Commandes",
          tabBarIcon: ({ focused }) => <TabIcon name="package-variant-closed" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: "Stock",
          tabBarIcon: ({ focused }) => <TabIcon name="layers-outline" focused={focused} />,
          tabBarBadge: belowThresholdCount > 0 ? belowThresholdCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.DECREASE_TEXT,
            color: colors.WHITE,
            fontSize: 10,
            fontFamily: "SemiBold",
            fontWeight: "700",
            minWidth: 18,
            height: 18,
            lineHeight: 16,
            borderRadius: 9,
          },
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Scan",
          tabBarIcon: ({ focused }) => <TabIcon name="line-scan" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="panier"
        options={{
          title: "Panier",
          tabBarIcon: ({ focused }) => <TabIcon name="cart-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Stats",
          tabBarIcon: ({ focused }) => <TabIcon name="chart-bar" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
