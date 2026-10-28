type NavigationEntryKey = "orders" | "scan";

export type NavigationEntry = {
  key: NavigationEntryKey;
  label: string;
  icon: "box" | "viewfinder";
  route: "orders" | "index";
  state: "active" | "locked";
};

const ORDERS: NavigationEntry = { key: "orders", label: "Commandes", icon: "box", route: "orders", state: "active" };
const SCAN: NavigationEntry = { key: "scan", label: "Scan", icon: "viewfinder", route: "index", state: "active" };

export function navigationEntries(): { entries: readonly NavigationEntry[]; openingEntry: NavigationEntry } {
  return { entries: [ORDERS, SCAN], openingEntry: SCAN };
}
