import { Tabs } from "expo-router";

import OrdersIcon from "../../assets/images/figma/tab-orders.svg";
import ScanIcon from "../../assets/images/figma/tab-scan.svg";
import TabBar, { TabBarIcons } from "../../components/TabBar";
import { isTablet } from "@/constants/layout";
import { ScanCameraProvider } from "@/context/ScanCameraContext";
import { navigationEntries } from "@/services/NavigationEntries";

const ICONS: TabBarIcons = {
  box: OrdersIcon,
  viewfinder: ScanIcon,
};

export default function TabLayout() {
  const { entries, openingEntry } = navigationEntries();
  const tablet = isTablet();

  return (
    <ScanCameraProvider>
      <Tabs
        initialRouteName={openingEntry.route}
        backBehavior="initialRoute"
        screenOptions={{ headerShown: false }}
        tabBar={(props) => (tablet ? null : <TabBar {...props} entries={entries} icons={ICONS} />)}
      >
        {entries.map((entry) => (
          <Tabs.Screen key={entry.key} name={entry.route} options={{ title: entry.label }} />
        ))}
      </Tabs>
    </ScanCameraProvider>
  );
}
