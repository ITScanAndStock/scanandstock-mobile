import Constants from "expo-constants";
import { Tabs } from "expo-router";

import AlertsIcon from "../../assets/images/figma/nav-alerts.svg";
import CartIcon from "../../assets/images/figma/nav-cart.svg";
import KitsIcon from "../../assets/images/figma/nav-kits.svg";
import ProvidersIcon from "../../assets/images/figma/nav-providers.svg";
import StatsIcon from "../../assets/images/figma/nav-stats.svg";
import StockIcon from "../../assets/images/figma/nav-stock.svg";
import OrdersIcon from "../../assets/images/figma/tab-orders.svg";
import ScanIcon from "../../assets/images/figma/tab-scan.svg";
import SideRail from "../../components/SideRail";
import TabBar, { TabBarIcons } from "../../components/TabBar";
import { isTablet } from "@/constants/layout";
import { ScanCameraProvider } from "@/context/ScanCameraContext";
import { navigationEntries, parseShowLockedNav } from "@/services/NavigationEntries";

const ICONS: TabBarIcons = {
  box: OrdersIcon,
  viewfinder: ScanIcon,
  layers: StockIcon,
  cart: CartIcon,
  alert: AlertsIcon,
  truck: ProvidersIcon,
  grid: KitsIcon,
  bars: StatsIcon,
};

// A static reference: babel inlines it in builds, which it cannot do for a dynamic process.env key.
const SHOW_LOCKED_NAV = parseShowLockedNav(
  process.env.EXPO_PUBLIC_SHOW_LOCKED_NAV ?? Constants.expoConfig?.extra?.SHOW_LOCKED_NAV,
);

export default function TabLayout() {
  const tablet = isTablet();
  const { entries, openingEntry } = navigationEntries({ tablet, showLockedEntries: SHOW_LOCKED_NAV });

  return (
    <ScanCameraProvider>
      <Tabs
        initialRouteName={openingEntry.route}
        backBehavior="initialRoute"
        screenOptions={{ headerShown: false }}
        tabBar={(props) =>
          tablet ? (
            <SideRail {...props} entries={entries} icons={ICONS} />
          ) : (
            <TabBar {...props} entries={entries} icons={ICONS} />
          )
        }
      >
        {entries
          .filter((entry) => entry.state === "active")
          .map((entry) => (
            <Tabs.Screen key={entry.key} name={entry.route} options={{ title: entry.label }} />
          ))}
      </Tabs>
    </ScanCameraProvider>
  );
}
