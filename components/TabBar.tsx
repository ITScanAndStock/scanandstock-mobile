import type { FC } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import type { BottomTabBarProps } from "expo-router/tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SvgProps } from "react-native-svg";

import { colors } from "../constants/colors";
import { isTablet } from "../constants/layout";
import { useScanCamera } from "../context/ScanCameraContext";
import { NavigationEntry } from "../services/NavigationEntries";

const TAB_BAR_CONTENT_HEIGHT = 50;

export type TabBarIcons = Record<NavigationEntry["icon"], FC<SvgProps>>;

type TabBarProps = BottomTabBarProps & {
  entries: readonly NavigationEntry[];
  icons: TabBarIcons;
};

export function useScreenBottomInset() {
  const insets = useSafeAreaInsets();
  return isTablet() ? insets.bottom : TAB_BAR_CONTENT_HEIGHT + insets.bottom;
}

export default function TabBar({ state, navigation, insets, entries, icons }: TabBarProps) {
  const { isCameraOpen, homeOpacity } = useScanCamera();
  const focusedRoute = state.routes[state.index];

  return (
    <Animated.View
      style={[styles.bar, { height: TAB_BAR_CONTENT_HEIGHT + insets.bottom, opacity: homeOpacity }]}
      pointerEvents={isCameraOpen ? "none" : "auto"}
      importantForAccessibility={isCameraOpen ? "no-hide-descendants" : "auto"}
      accessibilityElementsHidden={isCameraOpen}
      accessibilityRole="tablist"
    >
      {entries.map((entry) => {
        const route = state.routes.find((candidate) => candidate.name === entry.route);
        if (!route) {
          return null;
        }
        const isFocused = route.key === focusedRoute.key;
        const tint = isFocused ? colors.GREEN_DARK : colors.MUTED;
        const Icon = icons[entry.icon];

        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={entry.key}
            onPress={onPress}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityLabel={entry.label}
            accessibilityState={{ selected: isFocused }}
          >
            <Icon width={24} height={24} color={tint} accessible={false} />
            <Text style={[styles.label, { color: tint }]}>{entry.label}</Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 8,
    backgroundColor: colors.WHITE,
    borderTopWidth: 1,
    borderTopColor: colors.TAB_BAR_BORDER,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontFamily: "SemiBold",
  },
});
