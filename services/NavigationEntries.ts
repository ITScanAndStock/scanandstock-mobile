type NavigationEntryKey = "home" | "orders" | "scan" | "stock" | "cart" | "alerts" | "providers" | "kits" | "stats";

type NavigationEntryIcon = "box" | "viewfinder" | "layers" | "cart" | "alert" | "truck" | "grid" | "bars";

type NavigationEntryBase = {
  key: NavigationEntryKey;
  label: string;
  icon: NavigationEntryIcon;
};

export type ActiveNavigationEntry = NavigationEntryBase & { route: "orders" | "index"; state: "active" };

export type NavigationEntry = ActiveNavigationEntry | (NavigationEntryBase & { state: "locked" });

const ORDERS: ActiveNavigationEntry = { key: "orders", label: "Commandes", icon: "box", route: "orders", state: "active" };
const SCAN: ActiveNavigationEntry = { key: "scan", label: "Scan", icon: "viewfinder", route: "index", state: "active" };
const HOME: ActiveNavigationEntry = { key: "home", label: "Accueil", icon: "viewfinder", route: "index", state: "active" };

const LOCKED_TABLET_ENTRIES: readonly NavigationEntry[] = [
  { key: "stock", label: "Stock", icon: "layers", state: "locked" },
  { key: "cart", label: "Panier", icon: "cart", state: "locked" },
  { key: "alerts", label: "Alertes", icon: "alert", state: "locked" },
  { key: "providers", label: "Fournisseurs", icon: "truck", state: "locked" },
  { key: "kits", label: "Kits", icon: "grid", state: "locked" },
  { key: "stats", label: "Stats", icon: "bars", state: "locked" },
];

export function navigationEntries({ tablet, showLockedEntries }: { tablet: boolean; showLockedEntries: boolean }): {
  entries: readonly NavigationEntry[];
  openingEntry: ActiveNavigationEntry;
} {
  if (!tablet) {
    return { entries: [ORDERS, SCAN], openingEntry: SCAN };
  }
  const locked = showLockedEntries ? LOCKED_TABLET_ENTRIES : [];
  return { entries: [HOME, ORDERS, ...locked], openingEntry: HOME };
}

export function parseShowLockedNav(value: string | undefined): boolean {
  return value !== "false";
}
